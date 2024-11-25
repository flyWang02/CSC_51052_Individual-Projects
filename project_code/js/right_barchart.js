// 全局变量
let consumptionData = [];

// 定义部门结构
const SECTOR_STRUCTURE = {
    industry: {
        name: "Industry",
        subsectors: {
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
        }
    },
    transport: {
        name: "Transport",
        subsectors: {
            rail: "Final consumption - transport sector - rail - energy use",
            road: "Final consumption - transport sector - road - energy use",
            pipeline: "Final consumption - transport sector - pipeline transport - energy use"
        }
    },
    other: {
        name: "Other",
        subsectors: {
            households: "Final consumption - other sectors - households - energy use",
            agriculture: "Final consumption - other sectors - agriculture and forestry - energy use",
            services: "Final consumption - other sectors - commercial and public services - energy use",
            fishing: "Final consumption - other sectors - fishing - energy use"
        }
    }
};

// 定义颜色方案
const COLOR_SCHEMES = {
    industry: [
        "#08519c", "#3182bd", "#6baed6", "#9ecae1", "#c6dbef", 
        "#4292c6", "#2171b5", "#084594", "#082c7c", "#08306b",
        "#2166ac", "#4393c3"
    ],
    transport: [
        "#d94801", "#fd8d3c", "#fdae6b", "#fdd0a2",
        "#f16913", "#d94801", "#a63603", "#7f2704"
    ],
    other: [
        "#31a354", "#74c476", "#a1d99b", "#c7e9c0",
        "#238b45", "#006d2c", "#00441b", "#41ab5d"
    ]
};

// 加载数据
async function loadConsumptionData(csvPath) {
    try {
        if (consumptionData.length === 0) {
            const response = await fetch(csvPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            consumptionData = d3.csvParse(csvText);
        }
        return consumptionData;
    } catch (error) {
        console.error("Error loading data:", error);
        throw error;
    }
}

// 处理数据
function processEUTotalData(data, year) {
    const yearData = data.filter(row => row.TIME_PERIOD === year);
    const sectorData = {};

    Object.entries(SECTOR_STRUCTURE).forEach(([sectorKey, sectorInfo]) => {
        sectorData[sectorKey] = {
            name: sectorInfo.name,
            total: 0,
            subsectors: []
        };

        Object.entries(sectorInfo.subsectors).forEach(([subKey, balanceKey]) => {
            const subSectorData = yearData.filter(row => row.nrg_bal === balanceKey)
                .reduce((sum, row) => sum + (parseFloat(row.OBS_VALUE) || 0), 0);

            if (subSectorData > 0) {
                sectorData[sectorKey].subsectors.push({
                    name: subKey,
                    value: subSectorData,
                    fullName: balanceKey
                });
                sectorData[sectorKey].total += subSectorData;
            }
        });

        // 按照值从小到大排序，这样堆叠时较大的值会在底部
        sectorData[sectorKey].subsectors.sort((a, b) => a.value - b.value);
    });

    return sectorData;
}

// 创建图表
function createBarChart(container, data, width, height, margin, year) {
    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "euec-chart-svg")
        .append("g")
        .attr("class", "euec-chart-container")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 按总量排序部门
    const sectors = Object.keys(data)
        .sort((a, b) => data[b].total - data[a].total);

    // 创建比例尺
    const x = d3.scaleBand()
        .domain(sectors)
        .range([0, width])
        .padding(0.3);

        const y = d3.scaleLinear()
        .domain([0, Math.max(0, d3.max(Object.values(data), d => d.total))])
        .range([height, 0]);
        
    

    // 创建颜色比例尺
    const colorScales = {};
    Object.keys(COLOR_SCHEMES).forEach(sector => {
        colorScales[sector] = d3.scaleOrdinal()
            .domain(data[sector].subsectors.map(d => d.name))
            .range(COLOR_SCHEMES[sector]);
    });

    // 创建提示框
    const tooltip = d3.select("body").append("div")
        .attr("class", "euec-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "8px")
        .style("padding", "12px")
        .style("font-size", "12px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("display", "none");

    // 添加标题
    svg.append("text")
        .attr("class", "euec-chart-title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`EU Electricity Consumption by Sectors (${year})`);

    // 添加坐标轴
    svg.append("g")
        .attr("class", "euec-axis-x")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickFormat(d => data[d].name));

    svg.append("g")
        .attr("class", "euec-axis-y")
        .call(d3.axisLeft(y)
            .tickFormat(d => `${d3.format(".2s")(d)} GWh`));

    // 绘制堆叠柱状图
    sectors.forEach(sector => {
        let cumulative = height;
        const sectorGroup = svg.append("g")
            .attr("class", `euec-sector-${sector}`)
            .attr("id", `euec-sector-group-${sector}`);

        const reversedSubsectors = [...data[sector].subsectors].reverse();

        sectorGroup.selectAll(".euec-bar")
            .data(reversedSubsectors)
            .enter()
            .append("rect")
            .attr("class", "euec-bar")
            .attr("id", (d) => `euec-bar-${sector}-${d.name}`)
            .attr("x", x(sector))
            .attr("y", d => {
                const barHeight = height - y(d.value);
                cumulative -= barHeight;
                return cumulative;
            })
            .attr("height", d => height - y(d.value))
            .attr("width", x.bandwidth())
            .attr("fill", d => colorScales[sector](d.name))
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("opacity", 0.8)
                    .style("stroke", "#000")
                    .style("stroke-width", 2);

                d3.select(`#euec-legend-item-${sector}-${d.name}`)
                    .select("text")
                    .style("font-weight", "bold");
                d3.select(`#euec-legend-item-${sector}-${d.name}`)
                    .select("rect")
                    .style("opacity", 0.8);

                const sectorTotal = data[sector].total;
                const percentage = (d.value / sectorTotal * 100).toFixed(1);

                tooltip
                    .style("display", "block")
                    .style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 15}px`)
                    .html(`
                        <div style="margin-bottom: 8px; font-weight: bold; color: ${colorScales[sector](d.name)}; border-bottom: 1px solid #eee; padding-bottom: 4px">
                            ${data[sector].name} - ${d.name}
                        </div>
                        <div style="margin-bottom: 4px">
                            <span style="color: #666">Consumption: </span>
                            <span style="font-weight: bold">${d3.format(",.0f")(d.value)} GWh</span>
                        </div>
                        <div>
                            <span style="color: #666">Share of Sector: </span>
                            <span style="font-weight: bold">${percentage}%</span>
                        </div>
                    `)
                    .transition()
                    .duration(200)
                    .style("opacity", 0.9);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 15}px`);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("opacity", 1)
                    .style("stroke", "none");

                d3.select(`#euec-legend-item-${sector}-${d.name}`)
                    .select("text")
                    .style("font-weight", "normal");
                d3.select(`#euec-legend-item-${sector}-${d.name}`)
                    .select("rect")
                    .style("opacity", 1);

                tooltip.style("display", "none")
                       .style("opacity", 0);
            });
    });

    // 添加图例
    let legendY = 0;
    const itemSpacing = 15;
    const legendSectorSpacing = 15;

    sectors.forEach((sector, sectorIndex) => {
        const legend = svg.append("g")
            .attr("class", "euec-legend")
            .attr("id", `euec-legend-${sector}`);

        if (sectorIndex === 0) {
            legend.attr("transform", `translate(${width + 20}, ${legendY})`);
        } else {
            legend.attr("transform", `translate(${width + 20}, 0)`);
        }

        legend.append("text")
            .attr("class", "euec-legend-title")
            .attr("x", 0)
            .attr("y", sectorIndex === 0 ? 0 : legendY)
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .text(`${data[sector].name} (${d3.format(",.0f")(data[sector].total)} GWh)`);

        legendY += itemSpacing;

        const sortedSubsectors = [...data[sector].subsectors].reverse();

        sortedSubsectors.forEach((subsector, i) => {
            const legendItem = legend.append("g")
                .attr("class", "euec-legend-item")
                .attr("id", `euec-legend-item-${sector}-${subsector.name}`);

            if (sectorIndex === 0) {
                legendItem.attr("transform", `translate(5, ${i * itemSpacing + itemSpacing})`);
            } else {
                legendItem.attr("transform", `translate(5, ${legendY + i * itemSpacing})`);
            }

            legendItem.append("rect")
                .attr("class", "euec-legend-rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", colorScales[sector](subsector.name));

            const formattedValue = d3.format(",.0f")(subsector.value);
            legendItem.append("text")
                .attr("class", "euec-legend-text")
                .attr("x", 20)
                .attr("y", 10)
                .style("font-size", "12px")
                .style("fill", "#333")
                .text(`${subsector.name} (${formattedValue} GWh)`);

            legendItem
                .style("cursor", "pointer")
                .on("mouseover", function() {
                    d3.select(this).select("text")
                        .style("font-weight", "bold");
                    d3.select(this).select("rect")
                        .style("opacity", 0.8);

                    svg.selectAll(".euec-bar")
                        .filter(d => d && d.name === subsector.name)
                        .style("opacity", 0.8)
                        .style("stroke", "#000")
                        .style("stroke-width", 1);
                })
                .on("mouseout", function() {
                    d3.select(this).select("text")
                        .style("font-weight", "normal");
                    d3.select(this).select("rect")
                        .style("opacity", 1);

                    svg.selectAll(".euec-bar")
                        .filter(d => d && d.name === subsector.name)
                        .style("opacity", 1)
                        .style("stroke", "none");
                });
        });

        legendY += (sortedSubsectors.length * itemSpacing) + legendSectorSpacing;
    });
}

// 创建并添加柱状图函数
async function createAndAddBarChart(containerSelector, csvPath, selectedYear) {
    const container = d3.select(containerSelector);
    const margin = { top: 40, right: 250, bottom: 40, left: 60 };
    const width = parseInt(container.style("width")) - margin.left - margin.right;
    const height = Math.min(400, parseInt(container.style("height")) - margin.top - margin.bottom);

    try {
        const data = await loadConsumptionData(csvPath);
        const processedData = processEUTotalData(data, selectedYear);
        createBarChart(container, processedData, width, height, margin, selectedYear);
    } catch (error) {
        console.error("Error creating bar chart:", error);
        container.html(`<div class="error">Error loading visualization: ${error.message}</div>`);
    }
}

