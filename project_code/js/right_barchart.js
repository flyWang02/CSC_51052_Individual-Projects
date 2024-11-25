// 全局变量和部门结构保持不变
let consumptionData = [];

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

const COLOR_SCHEMES = {
    industry: ["#08519c", "#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#4292c6", "#2171b5", "#084594", "#082c7c", "#08306b", "#2166ac", "#4393c3"],
    transport: ["#d94801", "#fd8d3c", "#fdae6b", "#fdd0a2", "#f16913", "#d94801", "#a63603", "#7f2704"],
    other: ["#31a354", "#74c476", "#a1d99b", "#c7e9c0", "#238b45", "#006d2c", "#00441b", "#41ab5d"]
};

async function loadConsumptionData(csvPath) {
    if (consumptionData.length === 0) {
        const response = await fetch(csvPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        consumptionData = d3.csvParse(await response.text());
    }
    return consumptionData;
}

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

        sectorData[sectorKey].subsectors.sort((a, b) => a.value - b.value);
    });

    return sectorData;
}

function createBarChart(container, data, width, height, margin, year) {
    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "euec-chart-svg")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const sectors = Object.keys(data).sort((a, b) => data[b].total - data[a].total);

    const x = d3.scaleBand()
        .domain(sectors)
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, Math.max(0, d3.max(Object.values(data), d => d.total))])
        .range([height, 0]);

    const colorScales = {};
    Object.keys(COLOR_SCHEMES).forEach(sector => {
        colorScales[sector] = d3.scaleOrdinal()
            .domain(data[sector].subsectors.map(d => d.name))
            .range(COLOR_SCHEMES[sector]);
    });

    // 创建新的tooltip
    if (!d3.select("body").select(".euec-tooltip").empty()) {
        d3.select("body").select(".euec-tooltip").remove();
    }
    
    const tooltip = d3.select("body")
        .append("div")
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
        .style("display", "none")
        .style("z-index", "1000");

    svg.append("text")
        .attr("class", "euec-chart-title")
        .attr("x", width )
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`EU Electricity Consumption by Sectors (${year})`);

    svg.append("g")
        .attr("class", "euec-axis-x")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => data[d].name));

    svg.append("g")
        .attr("class", "euec-axis-y")
        .call(d3.axisLeft(y).tickFormat(d => `${d3.format(".2s")(d)} GWh`));

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
            .attr("id", d => `euec-bar-${sector}-${d.name}`)
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
                const bar = d3.select(this);
                bar.style("opacity", 0.8)
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
                    .style("opacity", 1)
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
                    `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 15}px`);
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .style("opacity", 1)
                    .style("stroke", "none");

                d3.select(`#euec-legend-item-${sector}-${d.name}`)
                    .select("text")
                    .style("font-weight", "normal");
                d3.select(`#euec-legend-item-${sector}-${d.name}`)
                    .select("rect")
                    .style("opacity", 1);

                tooltip
                    .style("opacity", 0)
                    .style("display", "none");
            });
    });

    const legendSpacing =17;
    let currentY = 0;
    
    sectors.forEach((sector) => {
        const legend = svg.append("g")
            .attr("class", "euec-legend")
            .attr("transform", `translate(${width + 16}, 0)`);
    
        // 标题项
        legend.append("text")
            .attr("class", "euec-legend-title")
            .attr("transform", `translate(5, ${currentY })`)
            .style("font-weight", "bold")
            .style("font-size", "15px")
            .text(`${data[sector].name} (${d3.format(",.0f")(data[sector].total)} GWh)`);
        
        currentY += legendSpacing;
    
        const sortedSubsectors = [...data[sector].subsectors].reverse();
        sortedSubsectors.forEach((subsector) => {
            const legendItem = legend.append("g")
                .attr("class", "euec-legend-item")
                .attr("id", `euec-legend-item-${sector}-${subsector.name}`)
                .attr("transform", `translate(5, ${currentY})`)
                .style("cursor", "pointer");
    
            legendItem.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("y", -9)
                .attr("fill", colorScales[sector](subsector.name));
    
            legendItem.append("text")
                .attr("x", 20)
                .attr("y", 2)
                .style("font-size", "12px")
                .text(`${subsector.name} (${d3.format(",.0f")(subsector.value)} GWh)`);
    
            // 交互事件
            legendItem
                .on("mouseover", function() {
                    d3.select(this).select("text")
                        .style("font-weight", "bold");
                    d3.select(this).select("rect")
                        .style("opacity", 0.8);
    
                    const bar = svg.select(`#euec-bar-${sector}-${subsector.name}`);
                    bar.style("opacity", 0.8)
                       .style("stroke", "#000")
                       .style("stroke-width", 1);
                    
                    const barNode = bar.node();
                    const barRect = barNode.getBoundingClientRect();
                    const percentage = (subsector.value / data[sector].total * 100).toFixed(1);
    
                    tooltip
                        .style("display", "block")
                        .style("opacity", 1)
                        .style("left", `${barRect.left + barRect.width / 2}px`)
                        .style("top", `${barRect.top - 15}px`)
                        .html(`
                            <div style="margin-bottom: 8px; font-weight: bold; color: ${colorScales[sector](subsector.name)}; border-bottom: 1px solid #eee; padding-bottom: 4px">
                                ${data[sector].name} - ${subsector.name}
                            </div>
                            <div style="margin-bottom: 4px">
                                <span style="color: #666">Consumption: </span>
                                <span style="font-weight: bold">${d3.format(",.0f")(subsector.value)} GWh</span>
                            </div>
                            <div>
                                <span style="color: #666">Share of Sector: </span>
                                <span style="font-weight: bold">${percentage}%</span>
                            </div>
                        `);
                })
                .on("mouseout", function() {
                    d3.select(this).select("text")
                        .style("font-weight", "normal");
                    d3.select(this).select("rect")
                        .style("opacity", 1);
    
                    svg.select(`#euec-bar-${sector}-${subsector.name}`)
                        .style("opacity", 1)
                        .style("stroke", "none");
    
                    tooltip
                        .style("opacity", 0)
                        .style("display", "none");
                });
    
            currentY += legendSpacing;
        });
    });
}

async function createAndAddBarChart(containerSelector, csvPath, selectedYear) {
    const container = d3.select(containerSelector);
    const margin = { top: 40, right: 200, bottom: 40, left: 60 };
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

// Export for use in other modules
window.createAndAddBarChart = createAndAddBarChart;