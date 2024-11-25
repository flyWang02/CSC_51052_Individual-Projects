// 全局变量
let consumptionData = []; // 存储过滤后的 Final_consumption.csv 数据

// 定义需要的部门结构
const SECTOR_STRUCTURE = {
    industry: {
        chemical: "Final consumption - industry sector - chemical and petrochemical - energy use",
        iron: "Final consumption - industry sector - iron and steel - energy use",
        nonferrous: "Final consumption - industry sector - non-ferrous metals - energy use",
        nonmetallic: "Final consumption - industry sector - non-metallic minerals - energy use",
        transport: "Final consumption - industry sector - transport equipment - energy use",
        machinery: "Final consumption - industry sector - machinery - energy use",
        mining: "Final consumption - industry sector - mining and quarrying - energy use",
        food: "Final consumption - industry sector - food, beverages and tobacco - energy use",
        paper: "Final consumption - industry sector - paper, pulp and printing - energy use",
        wood: "Final consumption - industry sector - wood and wood products - energy use",
        textile: "Final consumption - industry sector - textile and leather - energy use",
        construction: "Final consumption - industry sector - construction - energy use"
    },
    transport: {
        rail: "Final consumption - transport sector - rail - energy use",
        road: "Final consumption - transport sector - road - energy use",
        pipeline: "Final consumption - transport sector - pipeline transport - energy use"
    },
    other: {
        households: "Final consumption - other sectors - households - energy use",
        agriculture: "Final consumption - other sectors - agriculture and forestry - energy use",
        services: "Final consumption - other sectors - commercial and public services - energy use",
        fishing: "Final consumption - other sectors - fishing - energy use"
    }
};

// 过滤需要的部门数据
function isRelevantSector(nrg_bal) {
    return Object.values(SECTOR_STRUCTURE).some(sector => 
        Object.values(sector).includes(nrg_bal)
    );
}

// 加载并过滤数据
async function loadConsumptionData() {
    try {
        const response = await fetch('../data/ALLdata.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const allData = d3.csvParse(csvText);
        
        // 只保留需要的部门数据
        return allData.filter(row => 
            row.unit === "Gigawatt-hour" && 
            isRelevantSector(row.nrg_bal)
        );
    } catch (error) {
        console.error("Error loading consumption data:", error);
        throw error;
    }
}

// 主要更新函数
async function updateRightPanel() {
    const container = d3.select("#right-panel");
    const margin = {top: 40, right: 180, bottom: 100, left: 60};
    
    try {
        // 如果consumptionData为空，先加载数据
        if (consumptionData.length === 0) {
            consumptionData = await loadConsumptionData();
        }

        // 获取当前选中的年份
        const selectedYear = dataLoader.getSelectedYear();
        
        // 计算容器尺寸
        const width = parseInt(container.style("width")) - margin.left - margin.right;
        const height = parseInt(container.style("height")) - margin.top - margin.bottom;

        // 处理电力消费数据
        const processedData = processConsumptionData(consumptionData, selectedYear);
        
        // 创建可视化
        createStackedBarChart(container, processedData, width, height, margin, selectedYear);

    } catch (error) {
        console.error("Error in updateRightPanel:", error);
        container.html(`<div class="error">Error loading visualization: ${error.message}</div>`);
    }
}

// 处理数据为可视化格式
function processConsumptionData(data, year) {
    // 过滤当前年份的数据
    const yearData = data.filter(row => row.TIME_PERIOD === year);

    // 处理数据
    const processedData = {};
    
    yearData.forEach(row => {
        if (!row.geo || !row.nrg_bal || !row.OBS_VALUE) return;
        
        if (!processedData[row.geo]) {
            processedData[row.geo] = {
                country: row.geo,
                industryTotal: 0,
                transportTotal: 0,
                otherTotal: 0
            };
            
            // 初始化所有部门数据
            Object.entries(SECTOR_STRUCTURE).forEach(([mainSector, subSectors]) => {
                Object.entries(subSectors).forEach(([subSector, _]) => {
                    processedData[row.geo][`${mainSector}-${subSector}`] = 0;
                });
            });
        }

        const value = parseFloat(row.OBS_VALUE) || 0;

        // 匹配并分配数据到相应部门
        Object.entries(SECTOR_STRUCTURE).forEach(([mainSector, subSectors]) => {
            Object.entries(subSectors).forEach(([subSector, balanceKey]) => {
                if (row.nrg_bal === balanceKey) {
                    processedData[row.geo][`${mainSector}-${subSector}`] = value;
                    processedData[row.geo][`${mainSector}Total`] += value;
                }
            });
        });
    });

    // 转换为数组并排序
    return Object.values(processedData)
        .sort((a, b) => (b.industryTotal + b.transportTotal + b.otherTotal) - 
                        (a.industryTotal + a.transportTotal + a.otherTotal))
        .slice(0, 15); // 只显示前15个国家
}

// 创建堆叠柱状图
function createStackedBarChart(container, data, width, height, margin, year) {
    // 清空现有内容
    container.selectAll("*").remove();

    // 创建SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 定义需要堆叠的键
    const keys = [];
    Object.entries(SECTOR_STRUCTURE).forEach(([mainSector, subSectors]) => {
        Object.keys(subSectors).forEach(subSector => {
            keys.push(`${mainSector}-${subSector}`);
        });
    });

    // 创建比例尺
    const x = d3.scaleBand()
        .domain(data.map(d => d.country))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.industryTotal + d.transportTotal + d.otherTotal)])
        .range([height, 0]);

    // 创建颜色比例尺
    const colorScale = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), keys.length));

    // 创建堆叠生成器
    const stack = d3.stack()
        .keys(keys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    // 添加标题
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Electricity Consumption by Sector (${year})`);

    // 添加X轴
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // 添加Y轴
    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => `${d} GWh`));

    // 添加Y轴标签
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Electricity Consumption (GWh)");

    // 创建提示框
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "3px")
        .style("padding", "10px")
        .style("pointer-events", "none");

    // 绘制堆叠的条形图
    const stackedData = stack(data);
    
    const layers = svg.selectAll("g.layer")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("class", "layer")
        .style("fill", (d, i) => colorScale(d.key));

    layers.selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.country))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", function(d) {
            const sectorKey = d3.select(this.parentNode).datum().key;
            const [mainSector, subSector] = sectorKey.split("-");
            const value = d[1] - d[0];
            
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            
            tooltip.html(`
                <strong>Country:</strong> ${d.data.country}<br/>
                <strong>Sector:</strong> ${mainSector} - ${subSector}<br/>
                <strong>Value:</strong> ${value.toFixed(1)} GWh
            `)
            .style("left", (d3.event.pageX + 5) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // 添加图例
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 10}, 0)`);

    const legendItems = legend.selectAll(".legend-item")
        .data(keys)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => colorScale(d));

    legendItems.append("text")
        .attr("x", 15)
        .attr("y", 9)
        .text(d => {
            const [sector, subsector] = d.split("-");
            return `${sector} - ${subsector}`;
        })
        .style("font-size", "12px");
}

// 初始化
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // 加载消费数据
        consumptionData = await loadConsumptionData();
        
        // 初始化图表
        updateRightPanel();
        
        // 使用事件委托来监听年份变化
        document.addEventListener('change', function(e) {
            if (e.target.matches('input[name="yearRadio"]')) {
                updateRightPanel();
            }
        });

        // 监听字段选择按钮的点击事件
        document.addEventListener('click', function(e) {
            if (e.target.matches('.button-container button')) {
                updateRightPanel();
            }
        });

        // 监听窗口大小变化
        window.addEventListener("resize", () => {
            requestAnimationFrame(updateRightPanel);
        });

        // 将更新函数绑定到全局对象
        window.updateRightPanel = updateRightPanel;

    } catch (error) {
        console.error("Error during initialization:", error);
    }
});