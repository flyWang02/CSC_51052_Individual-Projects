// 引入 D3.js 绘制时间线折线图
// 请确保在 HTML 头部包含 D3 的 JS，如下所示：
// <script src="https://d3js.org/d3.v6.min.js"></script>

document.addEventListener('DOMContentLoaded', function () {
    // 获取 #timeline-chart 元素，添加 SVG 以显示数据
    const container = d3.select("#timeline-chart");
    const margin = {top: 20, right: 20, bottom: 40, left: 50};

    function drawChart() {
        // 清除之前的图表内容
        container.selectAll("*").remove();

        const containerWidth = parseInt(container.style("width"));
        const containerHeight = parseInt(container.style("height"));
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        // 设置 SVG 容器
        const svg = container.append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // 加载数据文件
        d3.json("../data/electricity-access.json").then(function(data) {
            // 绘制时间线折线图
            const timelineData = data.timeline;

            // 定义 x 轴和 y 轴比例尺
            const x = d3.scaleBand()
                .domain(timelineData.map(d => d.year))
                .range([0, width])
                .padding(0.2);

            const y = d3.scaleLinear()
                .domain([0, d3.max(timelineData, d => d.value)])
                .range([height, 0]);

            // 添加 x 轴
            svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.format("d"))) // 使用整数年份格式
                .selectAll("text")
                .style("text-anchor", "middle")
                .style("font-size", "10px"); // 调整字体大小以适应有限空间

            // 添加 y 轴
            svg.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}M`));

            // 定义折线生成器
            const line = d3.line()
                .x(d => x(d.year) + x.bandwidth() / 2)
                .y(d => y(d.value))
                .curve(d3.curveMonotoneX); // 平滑折线

            // 绘制折线
            svg.append("path")
                .datum(timelineData)
                .attr("fill", "none")
                .attr("stroke", "#4a90e2")
                .attr("stroke-width", 2)
                .attr("d", line);

            // 绘制数据点
            svg.selectAll(".dot")
                .data(timelineData)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.year) + x.bandwidth() / 2)
                .attr("cy", d => y(d.value))
                .attr("r", 4)
                .attr("fill", "#4a90e2")
                .append("title")
                .text(d => `${d.year}: ${d.value} million people without electricity`);
        });
    }

    // 初始绘制图表
    drawChart();

    // 确保响应式布局
    window.addEventListener('resize', drawChart);
});
