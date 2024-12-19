import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import EnergySankey from './EnergySankey';

class EnergyDataProcessor {
    constructor(rawData) {
        this.rawData = rawData;
        if (!this.rawData || typeof this.rawData !== 'string') {
            console.error('Invalid raw data:', this.rawData);
            throw new Error('Invalid raw data format');
        }
    }

    parseCSV() {
        if (!this.rawData) return [];

        const lines = this.rawData.split('\n')
            .filter(line => line.trim());

        const dataRows = lines.slice(1).map(line => {
            const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
            if (!matches || matches.length !== 10) return null;

            const [
                DATAFLOW,
                LAST_UPDATE,
                freq,
                nrg_bal,
                siec,
                unit,
                geo,
                TIME_PERIOD,
                OBS_VALUE,
                OBS_FLAG
            ] = matches.map(val => val.replace(/^"|"$/g, '').trim());

            const value = parseFloat(OBS_VALUE);
            const year = parseInt(TIME_PERIOD);

            if (isNaN(value) || isNaN(year)) {
                console.warn(`Invalid data found: Year=${TIME_PERIOD}, Value=${OBS_VALUE}`);
                return null;
            }

            return {
                dataFlow: DATAFLOW,
                lastUpdate: LAST_UPDATE,
                frequency: freq,
                energyBalance: nrg_bal,
                energyType: siec,
                unit: unit,
                country: geo,
                year: year,
                value: value,
                flag: OBS_FLAG
            };
        }).filter(row => row !== null);

        return dataRows;
    }

    getProductionConsumptionData() {
        const data = this.parseCSV();
        const yearlyData = {};

        data.forEach(item => {
            if (!yearlyData[item.year]) {
                yearlyData[item.year] = {
                    year: item.year,
                    production: 0,
                    consumption: 0,
                    losses: 0,
                    imports: 0,
                    exports: 0
                };
            }

            switch (item.energyBalance) {
                case "Gross electricity production":
                    yearlyData[item.year].production = item.value;
                    break;
                case "Final consumption":
                    yearlyData[item.year].consumption = item.value;
                    break;
                case "Losses":
                    yearlyData[item.year].losses = item.value;
                    break;
                case "Imports":
                    yearlyData[item.year].imports = item.value;
                    break;
                case "Exports":
                    yearlyData[item.year].exports = item.value;
                    break;
            }
        });

        return Object.values(yearlyData)
            .filter(d => {
                const hasValidData = !isNaN(d.year) &&
                    (d.production >= 0 || d.consumption >= 0 ||
                        d.imports >= 0 || d.exports >= 0);
                if (!hasValidData) {
                    console.warn(`Invalid yearly data found for year ${d.year}`);
                }
                return hasValidData;
            })
            .sort((a, b) => a.year - b.year);
    }

    getSectoralConsumptionData(year = null) {
        const data = this.parseCSV();
        const sectors = new Map();

        data.forEach(item => {
            if (year && item.year !== year) return;

            if (item.energyBalance.includes('Final consumption')) {
                let sector = null;

                if (item.energyBalance.includes('industry sector')) {
                    sector = 'Industry';
                } else if (item.energyBalance.includes('transport sector')) {
                    sector = 'Transport';
                } else if (item.energyBalance.includes('households')) {
                    sector = 'Residential';
                } else if (item.energyBalance.includes('commercial and public services')) {
                    sector = 'Commercial';
                } else if (item.energyBalance.includes('agriculture and forestry')) {
                    sector = 'Agriculture';
                }

                if (sector && !isNaN(item.value)) {
                    sectors.set(sector, (sectors.get(sector) || 0) + Math.max(0, item.value));
                }
            }
        });

        return Array.from(sectors, ([sector, value]) => ({
            sector,
            value: Math.max(0, value)
        }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }

    getIndustrialConsumptionData(year = null) {
        const data = this.parseCSV();
        const industrialSectors = new Map();

        data.forEach(item => {
            if (year && item.year !== year) return;

            if (item.energyBalance.includes('Final consumption - industry sector') &&
                item.energyBalance.includes('energy use')) {
                const sectorMatch = item.energyBalance.match(/industry sector - ([^-]+) - energy use/);
                if (sectorMatch && !isNaN(item.value)) {
                    const sector = sectorMatch[1].trim();
                    industrialSectors.set(sector, Math.max(0, item.value));
                }
            }
        });

        return Array.from(industrialSectors, ([name, value]) => ({
            name,
            value
        }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }

    getTransportConsumptionData(year = null) {
        const data = this.parseCSV();
        const transportSectors = new Map();

        data.forEach(item => {
            if (year && item.year !== year) return;

            if (item.energyBalance.includes('Final consumption - transport sector') &&
                item.energyBalance.includes('energy use')) {
                const sectorMatch = item.energyBalance.match(/transport sector - ([^-]+) - energy use/);
                if (sectorMatch && !isNaN(item.value)) {
                    const sector = sectorMatch[1].trim();
                    transportSectors.set(sector, Math.max(0, item.value));
                }
            }
        });

        return Array.from(transportSectors, ([name, value]) => ({
            name,
            value
        }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }

    

}

const EnergyCharts = ({ countryData }) => {
    const lineChartRef = useRef();
    const treemapRef = useRef();
    const radarChartRef = useRef();
    const transportPieRef = useRef();
    const [selectedYear, setSelectedYear] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        if (!countryData) return;

        const processor = new EnergyDataProcessor(countryData);
        const productionData = processor.getProductionConsumptionData();

        // Set available years and default to earliest year
        const years = productionData.map(d => d.year).sort((a, b) => a - b);
        setAvailableYears(years);
        if (!selectedYear && years.length > 0) {
            setSelectedYear(years[0]);
        }
    }, [countryData]);

    useEffect(() => {
        if (!countryData || !selectedYear) return;

        const processor = new EnergyDataProcessor(countryData);
        const productionData = processor.getProductionConsumptionData();
        const sectoralData = processor.getSectoralConsumptionData(selectedYear);
        const industrialData = processor.getIndustrialConsumptionData(selectedYear);
        const transportData = processor.getTransportConsumptionData(selectedYear);

        // Clear existing charts
        d3.select(lineChartRef.current).selectAll("*").remove();
        d3.select(treemapRef.current).selectAll("*").remove();
        d3.select(radarChartRef.current).selectAll("*").remove();
        d3.select(transportPieRef.current).selectAll("*").remove();

        const margin = { top:20, right:80, bottom: 40, left: 80 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Production and Consumption Line Chart
        const svg1 = d3.select(lineChartRef.current)
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain(d3.extent(productionData, d => d.year))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(productionData, d => Math.max(d.production, d.consumption)) * 1.1])
            .range([height, 0]);

        svg1.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg1.append("g")
            .call(d3.axisLeft(y));

        // Add legend
        const legend = svg1.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100}, 0)`);

        // Production legend
        legend.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 20)
            .attr("y2", 0)
            .attr("stroke", "#2196f3")
            .attr("stroke-width", 2);

        legend.append("text")
            .attr("x", 25)
            .attr("y", 0)
            .attr("dy", "0.32em")
            .text("Production")
            .attr("font-size", "12px");

        // Consumption legend
        legend.append("line")
            .attr("x1", 0)
            .attr("y1", 20)
            .attr("x2", 20)
            .attr("y2", 20)
            .attr("stroke", "#4caf50")
            .attr("stroke-width", 2);

        legend.append("text")
            .attr("x", 25)
            .attr("y", 20)
            .attr("dy", "0.32em")
            .text("Consumption")
            .attr("font-size", "12px");

        // Production line
        const line1 = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.production))
            .defined(d => !isNaN(d.production) && d.production !== null);

        svg1.append("path")
            .datum(productionData)
            .attr("class", "line production")
            .attr("fill", "none")
            .attr("stroke", "#2196f3")
            .attr("stroke-width", 2)
            .attr("d", line1);

        // Consumption line
        const line2 = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.consumption))
            .defined(d => !isNaN(d.consumption) && d.consumption !== null);

        svg1.append("path")
            .datum(productionData)
            .attr("class", "line consumption")
            .attr("fill", "none")
            .attr("stroke", "#4caf50")
            .attr("stroke-width", 2)
            .attr("d", line2);

// Inside the EnergyCharts component, update the radar chart section:

const radarWidth = 800;
const radarHeight = 400;
const radarRadius = Math.min(radarWidth, radarHeight) / 3;

const radarSvg = d3.select(radarChartRef.current)
    .attr("viewBox", `0 0 ${radarWidth} ${radarHeight}`)
    .append("g")
    .attr("transform", `translate(${radarWidth/2},${radarHeight/2})`);

// Calculate angles and create scales
const numSectors = sectoralData.length;
const angleStep = (2 * Math.PI) / numSectors;

const maxValue = d3.max(sectoralData, d => d.value);
const radiusScale = d3.scaleLinear()
    .domain([0, maxValue])
    .range([0, radarRadius]);

// Draw circular grid
const gridLevels = 5;
for (let i = 1; i <= gridLevels; i++) {
    const radius = (radarRadius * i) / gridLevels;
    radarSvg.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "#ddd")
        .attr("stroke-dasharray", "2,2");
}

// Calculate exact coordinates for data points
const points = sectoralData.map((d, i) => {
    const angle = (-Math.PI / 2) + (i * angleStep);
    const r = radiusScale(d.value);
    return {
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        angle: angle,
        value: d.value,
        sector: d.sector
    };
});

// Draw axis lines and labels
sectoralData.forEach((d, i) => {
    const angle = (-Math.PI / 2) + (i * angleStep);
    
    // Draw axis line
    radarSvg.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", radarRadius * Math.cos(angle))
        .attr("y2", radarRadius * Math.sin(angle))
        .attr("stroke", "#999")
        .attr("stroke-dasharray", "2,2");

    // Add label
    const labelRadius = radarRadius + 30;
    const labelX = labelRadius * Math.cos(angle);
    const labelY = labelRadius * Math.sin(angle);
    
    radarSvg.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", labelX > 0 ? "start" : labelX < 0 ? "end" : "middle")
        .attr("dominant-baseline", labelY > 0 ? "hanging" : labelY < 0 ? "baseline" : "middle")
        .attr("font-size", "12px")
        .text(`${d.sector} (${d.value.toFixed(1)} ktoe)`);
});

// Create polygon path from points
const pathData = "M" + points.map(p => `${p.x},${p.y}`).join("L") + "Z";

// Draw the polygon
radarSvg.append("path")
    .attr("d", pathData)
    .attr("fill", "rgba(33, 150, 243, 0.5)")
    .attr("stroke", "#2196f3")
    .attr("stroke-width", 2);

// Add data points (optional, can be removed if not needed)
points.forEach(point => {
    radarSvg.append("circle")
        .attr("cx", point.x)
        .attr("cy", point.y)
        .attr("r", 4)
        .attr("fill", "#2196f3")
        .attr("stroke", "white")
        .attr("stroke-width", 2);
});


// Industrial Consumption Treemap
        const treemapWidth = 800;
        const treemapHeight = 400;

        const treemapSvg = d3.select(treemapRef.current)
            .attr("viewBox", `0 0 ${treemapWidth} ${treemapHeight}`)
            .append("g");

        const root = d3.hierarchy({ children: industrialData })
            .sum(d => d.value);

        const treemap = d3.treemap()
            .size([treemapWidth, treemapHeight])
            .padding(1);

        treemap(root);

        const colorScale = d3.scaleOrdinal()
            .domain(industrialData.map(d => d.name))
            .range(['#ccdff1',
                '#b6cce2',
                '#a1b9d4',
                '#8ba5c4',
                '#7591b6',
                '#5f7ea6',
                '#496a98',
                '#335688',
                '#1e437a',
                '#08306b']); // 起始颜色和结束颜色

        const cell = treemapSvg.selectAll("g")
            .data(root.leaves())
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        cell.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.data.name))
            .attr("opacity", 0.8)
            .on("mouseover", function() {
                d3.select(this).attr("opacity", 1);
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 0.8);
            });

            cell.append("text")
            .attr("x", 4)
            .attr("y", 14)
            .attr("font-size", "10px")
            .attr("fill", "black")
            .style("font-weight", "bold") // 设置文本加粗
            .each(function(d) {
                const rectWidth = d.x1 - d.x0; // 矩形宽度
                const maxChars = Math.floor(rectWidth / 6); // 根据宽度计算最大字符数（大约6px/字符）
        
                const percentage = (d.data.value / d3.sum(industrialData, d => d.value) * 100).toFixed(1);
                const fullText = `${d.data.name} (${percentage}%)`;
        
                // 拆分文本
                const words = fullText.split(' ');
                let currentLine = '';
                let lines = [];
        
                words.forEach(word => {
                    if ((currentLine + ' ' + word).length <= maxChars) {
                        currentLine += (currentLine ? ' ' : '') + word;
                    } else {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                });
                lines.push(currentLine);
        
                // 添加换行文本
                lines.forEach((line, i) => {
                    d3.select(this).append("tspan")
                        .attr("x", 4)
                        .attr("y", 14 + i * 12) // 每行间隔12px
                        .text(line);
                });
        
                // 移除太小的矩形的文本
                if (rectWidth < 20 || d.y1 - d.y0 < 20) {
                    d3.select(this).selectAll("tspan").remove();
                }
            });
        
        // 添加 tooltip
        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "5px")
            .style("border-radius", "5px")
            .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("visibility", "hidden");

        // 绑定事件
        cell.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.data.name))
            .attr("opacity",0)
            .on("mouseover", function(event, d) {
                d3.select(this).attr("opacity", 1);
                tooltip.style("visibility", "visible")
                    .text(`${d.data.name}: ${d.data.value}`);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", `${event.pageY + 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 0);
                tooltip.style("visibility", "hidden");
            });

// Transport Consumption Pie Chart
const pieWidth = 800;
const pieHeight = 400;
const pieRadius = Math.min(pieWidth, pieHeight) / 3;

const pieSvg = d3.select(transportPieRef.current)
    .attr("viewBox", `0 0 ${pieWidth} ${pieHeight}`)
    .append("g")
    .attr("transform", `translate(${pieWidth / 2},${pieHeight / 2})`);

const transportColor = d3.scaleOrdinal()
    .domain(transportData.map(d => d.name))
    .range(d3.schemeSet3);

const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(pieRadius);

// Calculate total value and percentages
const totalValue = d3.sum(transportData, d => d.value);
transportData.forEach(d => {
    d.percentage = ((d.value / totalValue) * 100).toFixed(1);
});

const arcs = pieSvg.selectAll("arc")
    .data(pie(transportData))
    .enter()
    .append("g")
    .attr("class", "arc");

arcs.append("path")
    .attr("d", arc)
    .attr("fill", d => transportColor(d.data.name))
    .attr("stroke", "white")
    .attr("stroke-width", 2);

const legend2 = pieSvg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${pieRadius + 30}, -${pieRadius - 20})`);

transportData.forEach((d, i) => {
    const legendRow = legend2.append("g")
        .attr("transform", `translate(0, ${i * 25})`)
        .attr("class", "legend-item")
        .style("cursor", "pointer");

    legendRow.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", transportColor(d.name));

    legendRow.append("text")
        .attr("x", 20)
        .attr("y", 9)
        .text(`${d.name} (${d.value.toFixed(1)} GWh, ${d.percentage}%)`)
        .style("font-size", "12px");

    legendRow.on("mouseover", function() {
        const arcPaths = arcs.selectAll("path");
        arcPaths.style("stroke", function(arcData) {
            return arcData.data.name === d.name ? "#333" : "white";
        })
        .style("stroke-width", function(arcData) {
            return arcData.data.name === d.name ? 3 : 2;
        });

        d3.select(this).select("text")
            .style("font-weight", "bold");
    })
    .on("mouseout", function() {
        arcs.selectAll("path")
            .style("stroke", "white")
            .style("stroke-width", 2);

        d3.select(this).select("text")
            .style("font-weight", "normal");
    });
});

    }, [countryData, selectedYear]);

    if (!countryData) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">Loading data...</p>
            </div>
        );
    }

    return (
        <div className="country-details space-y-8">
            {/* Production and Consumption Trends Chart */}
            <div className="chart-container bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4">Trends in electricity production and consumption</h3>
                <p className="text-gray-600 mb-4">Demonstrate trends in electricity production and consumption over time</p>
                <div className="relative aspect-video">
                    <svg ref={lineChartRef} className="w-full h-full"></svg>
                </div>
            </div>

            {/* Year Selector */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4">Select Year</h3>
                <div className="flex items-center space-x-4">
                    <select
                        value={selectedYear || ''}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="form-select block w-full max-w-xs px-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {availableYears.map((year) => (
                            <option key={year} value={year}>
                               Year: {year}
                            </option>
                        ))}
                    </select>
                    <span className="text-gray-600">
                    View the detailed electricity usage structure for the year
                    </span>
                </div>
            </div>
            <EnergySankey selectedYear={selectedYear} countryData={countryData} />

            {/* Sectoral Consumption Radar Chart */}
            <div className="chart-container bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4">
                    Sectoral electricity consumption structure in {selectedYear}
                </h3>
                <p className="text-gray-600 mb-4">Demonstrate the distribution of electricity consumption in different sectors</p>
                <div className="relative aspect-video">
                    <svg ref={radarChartRef} className="w-full h-full"></svg>
                </div>
            </div>

            {/* Industrial Consumption Treemap */}
            <div className="chart-container bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4">
                Structure of electricity consumption in the industrial sector in {selectedYear}
                </h3>
                <p className="text-gray-600 mb-4">Demonstrate the share of electricity consumption by industrial subsector</p>
                <div className="relative aspect-video">
                    <svg ref={treemapRef} className="w-full h-full"></svg>
                </div>
            </div>

            {/* Transport Consumption Pie Chart */}
            <div className="chart-container bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4">
                Distribution of electricity consumption in the transport sector in {selectedYear}
                </h3>
                <p className="text-gray-600 mb-4">Demonstrate the share of electricity consumption by different modes of transport</p>
                <div className="relative aspect-video">
                    <svg ref={transportPieRef} className="w-full h-full"></svg>
                </div>
            </div>
        </div>
    );
};

export default EnergyCharts;