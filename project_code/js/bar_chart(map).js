document.addEventListener("DOMContentLoaded", async function () {
    const container = d3.select("#bar-chart");
    const margin = { top: 5, right: 25, bottom: 30, left: 30 };
    let isInitialLoad = true; // 用于标识动画是否是首次加载

    // 国家与国旗的映射
    const countryFlags = {
        "Austria": "https://flagcdn.com/at.svg",
        "Belgium": "https://flagcdn.com/be.svg",
        "Bulgaria": "https://flagcdn.com/bg.svg",
        "Croatia": "https://flagcdn.com/hr.svg",
        "Denmark": "https://flagcdn.com/dk.svg",
        "Estonia": "https://flagcdn.com/ee.svg",
        "Finland": "https://flagcdn.com/fi.svg",
        "France": "https://flagcdn.com/fr.svg",
        "Germany": "https://flagcdn.com/de.svg",
        "Greece": "https://flagcdn.com/gr.svg",
        "Hungary": "https://flagcdn.com/hu.svg",
        "Ireland": "https://flagcdn.com/ie.svg",
        "Italy": "https://flagcdn.com/it.svg",
        "Latvia": "https://flagcdn.com/lv.svg",
        "Lithuania": "https://flagcdn.com/lt.svg",
        "Luxembourg": "https://flagcdn.com/lu.svg",
        "Malta": "https://flagcdn.com/mt.svg",
        "Netherlands": "https://flagcdn.com/nl.svg",
        "Norway": "https://flagcdn.com/no.svg",
        "Poland": "https://flagcdn.com/pl.svg",
        "Portugal": "https://flagcdn.com/pt.svg",
        "Romania": "https://flagcdn.com/ro.svg",
        "Slovakia": "https://flagcdn.com/sk.svg",
        "Slovenia": "https://flagcdn.com/si.svg",
        "Spain": "https://flagcdn.com/es.svg",
        "Sweden": "https://flagcdn.com/se.svg"
    };

    // 加载数据并进行预处理
    const { csvData, europeanCountryNames } = await dataLoader.processData();

    // 定义更新柱状图的函数
    function updateBarChart() {
        // 获取当前选中的年份和字段
        const selectedYear = dataLoader.getSelectedYear();
        let selectedField = dataLoader.getSelectedField();
        if (!selectedField) {
            selectedField = "Gross_electricity_production";
        }

        const { countryMap, values } = dataLoader.filterDataByYearAndField(
            csvData,
            selectedYear,
            selectedField,
            europeanCountryNames
        );
        const data = Array.from(countryMap.entries()).map(([country, value]) => ({ country, value }));

        const containerWidth = parseInt(container.style("width")) - margin.left - margin.right;
        const containerHeight = parseInt(container.style("height")) - margin.top - margin.bottom;
        const width = Math.max(containerWidth, 100);
        const height = Math.max(containerHeight, 100);

        container.selectAll("*").remove();

        const svg = container.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(data.map(d => d.country))
            .range([0, width])
            .padding(0.2);

        // 最大值60w和最小值80差距太大，为了更好的可视化效果，使用对数比例尺
        const y = d3.scaleLog()
            .domain([Math.max(1, d3.min(values)), d3.max(values) * 1.5])
            .range([height, 0]);

        const tooltip = d3.select("body").append("div") // 创建悬浮框
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "5px")
            .style("border-radius", "3px")
            .style("pointer-events", "none")
            .style("font-size", "12px")
            .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.1)");

        svg.selectAll(".bar")
            .data(data, d => d.country)
            .join(
                enter => enter.append("rect")
                    .attr("class", "bar")
                    .attr("x", d => x(d.country))
                    .attr("y", isInitialLoad ? d => y(d.value) : height)
                    .attr("width", x.bandwidth())
                    .attr("height", isInitialLoad ? d => height - y(d.value) : 0)
                    .attr("fill", "#4a90e2")
                    .on("mouseover", (event, d) => { // 添加鼠标悬浮事件
                        tooltip.style("visibility", "visible")
                            .html(`<strong>${d.country}</strong><br>${selectedField.replace("_", " ")}: ${d.value.toLocaleString()} GWh`);
                    })
                    .on("mousemove", (event) => { // 鼠标移动时更新位置
                        tooltip.style("top", `${event.pageY - 10}px`)
                            .style("left", `${event.pageX + 10}px`);
                    })
                    .on("mouseout", () => { // 鼠标移出时隐藏提示框
                        tooltip.style("visibility", "hidden");
                    })
                    .call(enter => {
                        if (!isInitialLoad) {
                            enter.transition()
                                .duration(750)
                                .attr("y", d => y(d.value))
                                .attr("height", d => height - y(d.value));
                        }
                    }),
                update => update
                    .call(update => update.transition()
                        .duration(750)
                        .attr("y", d => y(d.value))
                        .attr("height", d => height - y(d.value)))
                    .on("mouseover", (event, d) => { // 添加鼠标悬浮事件
                        tooltip.style("visibility", "visible")
                            .html(`<strong>${d.country}</strong><br>${selectedField.replace("_", " ")}: ${d.value.toLocaleString()} GWh`);
                    })
                    .on("mousemove", (event) => { // 鼠标移动时更新位置
                        tooltip.style("top", `${event.pageY - 10}px`)
                            .style("left", `${event.pageX + 10}px`);
                    })
                    .on("mouseout", () => { // 鼠标移出时隐藏提示框
                        tooltip.style("visibility", "hidden");
                    }),
                exit => exit
                    .call(exit => exit.transition()
                        .duration(750)
                        .attr("y", height)
                        .attr("height", 0)
                        .remove())
            );


        svg.selectAll(".label")
            .data(data, d => d.country)
            .join(
                enter => enter.append("text")
                    .attr("class", "label")
                    .attr("x", d => x(d.country) + x.bandwidth() / 2)
                    .attr("y", isInitialLoad ? d => y(d.value) - 5 : height) // 首次加载直接绘制，不要动画
                    .attr("text-anchor", "middle")
                    .text(d => d.value.toFixed(1))
                    .call(enter => {
                        if (!isInitialLoad) {
                            enter.transition()
                                .duration(750)
                                .attr("y", d => y(d.value) - 5);
                        }
                    }),
                update => update
                    .call(update => update.transition()
                        .duration(750)
                        .attr("y", d => y(d.value) - 5)
                        .text(d => d.value.toFixed(1))),
                exit => exit
                    .call(exit => exit.transition()
                        .duration(750)
                        .attr("y", height)
                        .remove())
            );

        // 添加国旗到 x 轴（保持不变）
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x).tickSize(0).tickFormat(() => ""))
            .selectAll(".tick")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${x(d.country) + x.bandwidth() / 2}, 0)`)
            .append("image")
            .attr("xlink:href", d => countryFlags[d.country] || "")
            .attr("width", 20)
            .attr("height", 15)
            .attr("y", 5)
            .attr("x", -10);

        // 定义渐变
        svg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%")
            .selectAll("stop")
            .data([
                { offset: "0%", color: "#85a2e8" },
                { offset: "60%", color: "#2563eb" },
                { offset: "100%", color: "#1d4ed8" }
            ])
            .enter()
            .append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        // 更新首次加载标志位
        isInitialLoad = false;
    }

    // 初次加载时绘制柱状图
    updateBarChart();
    window.updateBarChart = updateBarChart;

    // 仅绑定更新柱状图的逻辑
    d3.selectAll("input[name='yearRadio']").on("change", updateBarChart);
    d3.selectAll(".button-container button").on("click", updateBarChart);
});
