// 引入 D3.js 绘制欧洲地图
// 请确保在 HTML 头部包含 D3 的 JS，如下所示：
// <script src="https://d3js.org/d3.v6.min.js"></script>

document.addEventListener('DOMContentLoaded', function () {
    // 设置 SVG 容器以绘制欧洲地图，宽度和高度适应容器大小，确保响应式布局
    const container = d3.select("#europe_map");
    const maxWidth = 600; // 地图宽度依然最大 600
    const maxHeight = 460; // 增加最大高度为 600，避免左右留白
    const width = Math.min(parseInt(container.style("width")), maxWidth);
    const height = Math.min(width * 1.2, maxHeight); // 高度调整为宽度的 1.2 倍，增加高度比例

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // 加载世界的 GeoJSON 数据以用作背景
    d3.json("../data/countries.geojson").then(function(worldData) {
        // 定义地理投影
        const projection = d3.geoMercator()
            .center([20, 55]) // 将地图中心设置在欧洲
            .scale(width / 1.5)
            .translate([width / 2, height / 2]);

        // 使用投影来定义路径生成器
        const path = d3.geoPath().projection(projection);

        // 绘制背景地图（灰色）
        svg.selectAll(".background-path")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("class", "background-path")
            .attr("d", path)
            .attr("fill", "#d3d3d3") // 背景国家为灰色
            .attr("stroke", "#fff");

        // 过滤欧洲国家的 GeoJSON 数据
        const europeanCountryNames = [
            "France", "Germany", "Italy", "Spain", "Poland", "United Kingdom", 
            "Sweden", "Norway", "Finland", "Denmark", "Netherlands", "Belgium", 
            "Austria", "Switzerland", "Portugal", "Ireland", "Greece", "Czechia", 
            "Hungary", "Slovakia", "Romania", "Bulgaria", "Serbia", "Croatia", 
            "Slovenia", "Bosnia and Herz.", "Albania", "North Macedonia", 
            "Montenegro", "Kosovo", "Latvia", "Lithuania", "Estonia"
        ];

        const europeanCountries = worldData.features.filter(d => europeanCountryNames.includes(d.properties.ADMIN || d.properties.NAME || d.properties.name));

        // 绘制欧洲地图（绿色）
        svg.selectAll(".europe-path")
            .data(europeanCountries)
            .enter()
            .append("path")
            .attr("class", "europe-path")
            .attr("d", path)
            .attr("fill", "#69b3a2") // 欧洲国家为绿色
            .attr("stroke", "#fff")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#4a90e2");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", "#69b3a2");
            })
            .append("title")
            .text(d => `${d.properties.ADMIN || d.properties.NAME || d.properties.name}: Access to Electricity`);

        // 确保欧洲国家绘制在背景之上
        svg.selectAll(".europe-path").raise();
    });
});