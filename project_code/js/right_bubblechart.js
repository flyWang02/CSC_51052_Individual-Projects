function createAndAddBubbleChart(containerSelector, csvPath, selectedYear) {
    const container = d3.select(containerSelector);
    
    const theme = {
        colors: {
            primary: "#4a90e2",
            hover: "#2171d3",
            background: "#fff",
            text: "#333"
        },
        fontSizes: {
            title: "14px",
            axis: "10px",
            label: "12px"
        },
        transition: "all 0.3s ease"
    };

    container
        .style("width", "100%")
        .style("position", "relative")
        .style("margin-bottom", "10px")
        .style("background", theme.colors.background);
    
    const tooltip = container.append("div")
        .style("position", "absolute")
        .style("opacity", "0")
        .style("background", "rgba(255, 255, 255, 0.95)")
        .style("padding", "8px 12px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", theme.fontSizes.label)
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
        .style("transition", theme.transition)
        .style("z-index", "100")
        .style("max-width", "200px");

    const processData = (energyData) => {
        const yearData = energyData.filter(d => d.TIME_PERIOD === selectedYear);
        const countryData = new Map();
        
        yearData.forEach(d => {
            const country = d.geo;
            if (!countryData.has(country)) {
                countryData.set(country, {
                    country,
                    exports: 0,
                    imports: 0,
                    production: 0,
                    consumption: 0
                });
            }
            const value = +d.OBS_VALUE;
            const data = countryData.get(country);
            
            switch (d.nrg_bal) {
                case 'Exports': data.exports = value; break;
                case 'Imports': data.imports = value; break;
                case 'Net electricity production': data.production = value; break;
                case 'Final consumption': data.consumption = value; break;
            }
        });

        return Array.from(countryData.values())
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
    };

    d3.csv(csvPath).then(energyData => {
        const dependencyData = processData(energyData);
        
        if (!dependencyData.length) {
            container.html(`<div style="text-align: center; padding: 20px; color: #666;">No data available for year ${selectedYear}</div>`);
            return;
        }

        const chartBounds = container.node().getBoundingClientRect();
        const margin = {
            top: chartBounds.height * 0.1,
            right: chartBounds.width * 0.1,
            bottom: chartBounds.height * 0.15,
            left: chartBounds.width * 0.15
        };
        const width = chartBounds.width - margin.left - margin.right;
        const height = chartBounds.height - margin.top - margin.bottom;

        container.selectAll("svg").remove();

        const svg = container.append("svg")
            .style("width", "100%")
            .style("height", "100%")
            .attr("viewBox", `0 0 ${chartBounds.width} ${chartBounds.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        const chartGroup = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(dependencyData, d => d.selfSufficiency) * 1.1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([
                Math.min(0, d3.min(dependencyData, d => d.dependencyRate) * 1.1),
                d3.max(dependencyData, d => d.dependencyRate) * 1.1
            ])
            .range([height, 0]);

        const rScale = d3.scaleSqrt()
            .domain([0, d3.max(dependencyData, d => d.importVolume)])
            .range([5, Math.min(width, height) * 0.05]);


        // Add grid lines
        chartGroup.append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(xScale.ticks(5))
            .enter().append("line")
            .attr("x1", d => xScale(d))
            .attr("x2", d => xScale(d))
            .attr("y1", 0)
            .attr("y2", height)
            .style("stroke", "#e0e0e0")
            .style("stroke-dasharray", "3,3");

        chartGroup.append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(yScale.ticks(5))
            .enter().append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", d => yScale(d))
            .attr("y2", d => yScale(d))
            .style("stroke", "#e0e0e0")
            .style("stroke-dasharray", "3,3");

        // Add axes
        chartGroup.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"))
            .style("font-size", theme.fontSizes.axis);
        
        chartGroup.append("g")
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + "%"))
            .style("font-size", theme.fontSizes.axis);

        // Add labels
        chartGroup.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom * 0.7)
            .style("text-anchor", "middle")
            .style("font-size", theme.fontSizes.label)
            .text("Energy Self-Sufficiency Rate (%)");

        chartGroup.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left * 0.7)
            .style("text-anchor", "middle")
            .style("font-size", theme.fontSizes.label)
            .text("Energy Dependency Rate (%)");

        chartGroup.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .style("text-anchor", "middle")
            .style("font-size", theme.fontSizes.title)
            .style("font-weight", "bold")
            .text(`Energy Relations ${selectedYear}`);

        // Add bubbles
        const bubbles = chartGroup.selectAll("circle")
            .data(dependencyData)
            .join("circle")
            .attr("cx", d => xScale(d.selfSufficiency))
            .attr("cy", d => Math.max(0, yScale(d.dependencyRate)))
            .attr("r", d => rScale(d.importVolume))
            .style("fill", theme.colors.primary)
            .style("fill-opacity", "0.6")
            .style("stroke", theme.colors.hover)
            .style("stroke-width", "1px")
            .style("transition", theme.transition);

        // Add interactivity
        bubbles
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("fill-opacity", "0.8")
                    .style("stroke-width", "2px")
                    .style("cursor", "pointer");
                
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
                    .style("cursor", "default");
                
                tooltip.style("opacity", "0");
            });

        // Add legend
        const legendGroup = chartGroup.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 120}, 20)`);

        legendGroup.append("text")
            .attr("x", 0)
            .attr("y", -5)
            .style("font-size", theme.fontSizes.label)
            .text("Import Volume");

        const legendData = [1000, 5000, 10000];
        legendGroup.selectAll("circle")
            .data(legendData)
            .enter()
            .append("circle")
            .attr("cx", 30)
            .attr("cy", (d, i) => i * 25 + 10)
            .attr("r", d => rScale(d))
            .style("fill", "none")
            .style("stroke", theme.colors.hover);

        legendGroup.selectAll("text.legend-label")
            .data(legendData)
            .enter()
            .append("text")
            .attr("class", "legend-label")
            .attr("x", 60)
            .attr("y", (d, i) => i * 25 + 15)
            .style("font-size", "10px")
            .text(d => `${d.toLocaleString()} GWh`);

        // Add resize observer
        let resizeTimeout;
        const resizeObserver = new ResizeObserver(() => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newBounds = container.node().getBoundingClientRect();
                svg.attr("viewBox", `0 0 ${newBounds.width} ${newBounds.height}`);
                rScale.range([5, Math.min(newBounds.width, newBounds.height) * 0.05]);
            }, 250);
        });
        resizeObserver.observe(container.node());
    });
}

window.createAndAddBubbleChart = createAndAddBubbleChart;