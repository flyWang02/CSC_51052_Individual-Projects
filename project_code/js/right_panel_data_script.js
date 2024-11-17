// 引入 D3.js 绘制右侧面板的数据部分
// 请确保在 HTML 头部包含 D3 的 JS，如下所示：
// <script src="https://d3js.org/d3.v6.min.js"></script>

document.addEventListener('DOMContentLoaded', function () {
    // 获取 #right-panel 元素，添加 SVG 以显示数据
    const container = d3.select("#right-panel");
    const margin = {top: 20, right: 20, bottom: 30, left: 40};

    function drawChart() {
        // 清除之前的图表内容
        container.selectAll("*").remove();

        const containerWidth = parseInt(container.style("width"));
        const width = containerWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        // 设置 SVG 容器
        const svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", height + margin.top + margin.bottom)
            .attr("viewBox", `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // 加载数据文件
        d3.json("../data/electricity-access.json").then(function(data) {
            // 绘制城乡电力获取对比条形图
            const ruralUrbanData = data.ruralUrban;

            // 定义 x 轴和 y 轴比例尺
            const x0 = d3.scaleBand()
                .domain(ruralUrbanData.map(d => d.country))
                .range([0, width])
                .padding(0.2);

            const x1 = d3.scaleBand()
                .domain(["rural", "urban"])
                .range([0, x0.bandwidth()])
                .padding(0.05);

            const y = d3.scaleLinear()
                .domain([0, 100])
                .range([height, 0]);

            // 添加 x 轴
            svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x0))
                .selectAll("text")
                .style("text-anchor", "middle");

            // 添加 y 轴
            svg.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));

            // 创建一个分组来容纳每个国家的条形
            const countryGroup = svg.selectAll(".country-group")
                .data(ruralUrbanData)
                .enter()
                .append("g")
                .attr("class", "country-group")
                .attr("transform", d => `translate(${x0(d.country)}, 0)`);

            // 绘制农村条形图
            countryGroup.selectAll(".bar-rural")
                .data(d => [{key: "rural", value: d.rural}])
                .enter()
                .append("rect")
                .attr("class", "bar-rural")
                .attr("x", d => x1(d.key))
                .attr("y", d => y(d.value))
                .attr("width", x1.bandwidth())
                .attr("height", d => height - y(d.value))
                .attr("fill", "#a6a6a6");

            // 绘制城市条形图
            countryGroup.selectAll(".bar-urban")
                .data(d => [{key: "urban", value: d.urban}])
                .enter()
                .append("rect")
                .attr("class", "bar-urban")
                .attr("x", d => x1(d.key))
                .attr("y", d => y(d.value))
                .attr("width", x1.bandwidth())
                .attr("height", d => height - y(d.value))
                .attr("fill", "#4a90e2");
        });
    }

    // 初始绘制图表
    drawChart();

    // 确保响应式布局
    window.addEventListener('resize', drawChart);
});