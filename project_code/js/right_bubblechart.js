function createAndAddBubbleChart(containerSelector, csvPath, selectedYear) {
    const container = d3.select(containerSelector);

    // 创建气泡图容器并设置样式
    container.style("height", "33.33%")  // 占容器高度的1/3
        .style("width", "100%")
        .style("position", "relative")
        .style("margin-bottom", "10px");
    
    // 创建tooltip并设置样式
    const tooltip = container.append("div")
        .style("position", "absolute")
        .style("opacity", "0")
        .style("background", "rgba(255, 255, 255, 0.95)")
        .style("padding", "8px 12px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
        .style("transition", "all 0.2s ease")
        .style("z-index", "100")
        .style("max-width", "200px");
    
    // 加载依赖数据
    d3.csv(csvPath).then(energyData => {
        // 处理数据：筛选特定年份的数据并计算指标
        const yearData = energyData.filter(d => d.TIME_PERIOD === selectedYear);
        const countryData = new Map();
        yearData.forEach(d => {
            const country = d.geo;
            if (!countryData.has(country)) {
                countryData.set(country, {
                    country: country,
                    exports: 0,
                    imports: 0,
                    production: 0,
                    consumption: 0
                });
            }
            const value = +d.OBS_VALUE;
            switch (d.nrg_bal) {
                case 'Exports':
                    countryData.get(country).exports = value;
                    break;
                case 'Imports':
                    countryData.get(country).imports = value;
                    break;
                case 'Net electricity production':
                    countryData.get(country).production = value;
                    break;
                case 'Final consumption':
                    countryData.get(country).consumption = value;
                    break;
            }
        });

        const dependencyData = Array.from(countryData.values())
            .map(d => ({
                country: d.country,
                selfSufficiency: (d.production / d.consumption * 100) || 0,
                dependencyRate: ((d.imports - d.exports) / d.consumption * 100) || 0,
                importVolume: d.imports
            }))
            .filter(d => !isNaN(d.selfSufficiency) &&
                       !isNaN(d.dependencyRate) &&
                       !isNaN(d.importVolume) &&
                       d.selfSufficiency !== 0 &&
                       d.dependencyRate !== 0);

        // 如果数据为空，显示提示信息
        if (!dependencyData || dependencyData.length === 0) {
            container.selectAll("*").remove();
            container.append("div")
                .style("text-align", "center")
                .style("padding", "20px")
                .style("color", "#666")
                .style("font-size", "14px")
                .text(`No data available for year ${selectedYear}`);
            return;
        }

        // 计算容器尺寸
        const chartBounds = container.node().getBoundingClientRect();
        const margin = {
            top: chartBounds.height * 0.1,
            right: chartBounds.width * 0.1,
            bottom: chartBounds.height * 0.15,
            left: chartBounds.width * 0.15
        };
        const width = chartBounds.width - margin.left - margin.right;
        const height = chartBounds.height - margin.top - margin.bottom;

        // 清空现有内容
        container.selectAll("svg").remove();

        // 创建SVG
        const svg = container.append("svg")
            .style("width", "100%")
            .style("height", "100%")
            .attr("viewBox", `0 0 ${chartBounds.width} ${chartBounds.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        // 添加图表组
        const chartGroup = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // 创建比例度
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(dependencyData, d => d.selfSufficiency) * 1.1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([Math.min(0, d3.min(dependencyData, d => d.dependencyRate) * 1.1), d3.max(dependencyData, d => d.dependencyRate) * 1.1])
            .range([height, 0]);

        const rScale = d3.scaleSqrt()
            .domain([0, d3.max(dependencyData, d => d.importVolume)])
            .range([5, Math.min(width, height) * 0.05]);

        // 添加坐标轴和标签
        chartGroup.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"))
            .style("font-size", "10px");
        
        chartGroup.append("g")
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + "%"))
            .style("font-size", "10px");

        chartGroup.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom * 0.7)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Energy Self-Sufficiency Rate (%)");

        chartGroup.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left * 0.7)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Energy Dependency Rate (%)");

        chartGroup.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text(`Energy Relations ${selectedYear}`);

        // 添加气泡
        chartGroup.selectAll("circle")
            .data(dependencyData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.selfSufficiency))
            .attr("cy", d => Math.max(0, yScale(d.dependencyRate)))
            .attr("r", d => rScale(d.importVolume))
            .style("fill", "#4a90e2")
            .style("fill-opacity", "0.6")
            .style("stroke", "#2171d3")
            .style("stroke-width", "1px")
            .style("transition", "all 0.2s ease")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("fill-opacity", "0.8")
                    .style("stroke-width", "2px")
                    .style("z-index", "10");
                
                const circleBox = this.getBoundingClientRect();
                const chartBox = container.node().getBoundingClientRect();
                
                tooltip
                    .style("opacity", "1")
                    .style("left", `${circleBox.left - chartBox.left + circleBox.width/2}px`)
                    .style("top", `${circleBox.top - chartBox.top - 60}px`)
                    .style("transform", "translateX(-50%)")
                    .html(`
                        <strong>${d.country}</strong><br/>
                        Self-Sufficiency: ${d.selfSufficiency.toFixed(1)}%<br/>
                        Dependency Rate: ${d.dependencyRate.toFixed(1)}%<br/>
                        Import Volume: ${d.importVolume.toLocaleString()} GWh
                    `);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("fill-opacity", "0.6")
                    .style("stroke-width", "1px")
                    .style("z-index", "1");
                
                tooltip.style("opacity", "0");
            });

        // 添加响应式调整
        function resize() {
            const newBounds = container.node().getBoundingClientRect();
            svg.attr("viewBox", `0 0 ${newBounds.width} ${newBounds.height}`);
            rScale.range([5, Math.min(newBounds.width, newBounds.height) * 0.05]);
        }

        window.addEventListener("resize", resize);
    }).catch(error => {
        console.error("Error loading energy data:", error);
    });
}

// 将函数挂载到全局 window 对象
window.createAndAddBubbleChart = createAndAddBubbleChart;
