document.addEventListener('DOMContentLoaded', function () {
    const container = d3.select("#europe_map");

    // 设置 SVG 的宽高为相对布局
    const svg = container.append("svg")
        .attr("width", "100%") // 响应式宽度
        .attr("height", "100%") // 响应式高度
        .attr("viewBox", `0 0 600 350`) // 设置初始视图框
        .attr("preserveAspectRatio", "xMidYMid meet") // 保持宽高比
        .style("overflow", "visible");

    // 定义裁剪路径
    const defs = svg.append("defs");
    const c_x = 360;
    const c_y = 182;
    const c_r = 170;

    defs.append("clipPath")
        .attr("id", "circle-clip")
        .append("circle")
        .attr("cx", c_x) // 响应式居中
        .attr("cy", c_y) // 响应式靠下
        .attr("r", c_r); // 响应式半径

    // 创建线性渐变，用于环的颜色渐变效果
    const ringGradient = defs
        .append('linearGradient')
        .attr('id', 'ring-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

    ringGradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#d3d3d3')
        .attr('stop-opacity', 0.5);

    ringGradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#B0C4DE')
        .attr('stop-opacity', 0);

    // 绘制白色背景圆
    svg.append("circle")
        .attr("cx", c_x) // 响应式居中
        .attr("cy", c_y) // 响应式靠下
        .attr("r", c_r) // 半径与裁剪路径一致
        .attr("fill", "#fff"); // 设置为白色背景

    // 在地图外面绘制渐变环
    svg.append("circle")
        .attr("cx", c_x) // 响应式居中
        .attr("cy", c_y+5) // 响应式靠下
        .attr("r", c_r + 20) // 比地图圆略大
        .attr("fill", "none")
        .attr("stroke", "url(#ring-gradient)") // 应用渐变
        .attr("stroke-width", 15); // 设置环的宽度

    // 加载世界的 GeoJSON 数据
    d3.json("../data/countries.geojson").then(function (worldData) {
        const projection = d3.geoMercator()
            .center([20, 55]) // 将地图中心设置在欧洲
            .scale(200) // 缩放地图
            .translate([c_x+20, c_y]); // 将地图内容定位到响应式位置

        const path = d3.geoPath().projection(projection);

        // 在裁剪路径内添加一个组
        const clippedGroup = svg.append("g")
            .attr("clip-path", "url(#circle-clip)");

        // 绘制背景地图（灰色）
        clippedGroup.selectAll(".background-path")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("class", "background-path")
            .attr("d", path)
            .attr("fill", "#d3d3d3") // 背景国家为灰色
            .attr("stroke", "#fff")
            .attr("fill-opacity", 0.3);

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

        // 绘制欧洲国家地图（绿色）
        clippedGroup.selectAll(".europe-path")
            .data(europeanCountries)
            .enter()
            .append("path")
            .attr("class", "europe-path")
            .attr("d", path)
            .attr("fill", "#69b3a2") // 欧洲国家为绿色
            .attr("stroke", "#fff")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("fill", "#4a90e2");
            })
            .on("mouseout", function (event, d) {
                d3.select(this).attr("fill", "#69b3a2");
            })
            .append("title")
            .text(d => `${d.properties.ADMIN || d.properties.NAME || d.properties.name}: Access to Electricity`);

        // 确保欧洲国家绘制在背景之上
        clippedGroup.selectAll(".europe-path").raise();
    });
});
