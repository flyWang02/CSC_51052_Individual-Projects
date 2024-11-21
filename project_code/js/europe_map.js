// 监听 DOMContentLoaded 事件，确保页面加载完成后执行代码
document.addEventListener("DOMContentLoaded", async function () {

    // 选择用于绘制地图的容器
    const container = d3.select("#europe_map");

    // 创建一个 SVG 元素，用于绘制地图
    const svg = container.append("svg")
        .attr("width", "100%") // 设置宽度为容器的 100%
        .attr("height", "100%") // 设置高度为容器的 100%
        .attr("viewBox", `0 0 600 345`) // 设置视图框大小
        .attr("preserveAspectRatio", "xMidYMid meet") // 保持纵横比，内容居中
        .style("overflow", "visible"); // 允许内容超出 SVG 边界

    // 定义剪辑路径和渐变效果
    const defs = svg.append("defs");
    const c_x = 250; // 圆心 X 坐标
    const c_y = 185; // 圆心 Y 坐标
    const c_r = 165; // 圆半径

    // 定义一个剪辑路径，限制地图的显示区域
    defs.append("clipPath")
        .attr("id", "circle-clip")
        .append("circle")
        .attr("cx", c_x) // 设置圆心 X 坐标
        .attr("cy", c_y) // 设置圆心 Y 坐标
        .attr("r", c_r); // 设置圆的半径

    // 定义一个线性渐变，用于绘制环形效果
    const ringGradient = defs
        .append("linearGradient")
        .attr("id", "ring-gradient") // 设置渐变 ID
        .attr("x1", "0%") // 起始点 X 坐标
        .attr("y1", "0%") // 起始点 Y 坐标
        .attr("x2", "0%") // 结束点 X 坐标
        .attr("y2", "100%"); // 结束点 Y 坐标

    // 渐变起点颜色
    ringGradient.append("stop")
        .attr("offset", "0%") // 起点位置
        .attr("stop-color", "#e1e6ee") // 起点颜色
        .attr("stop-opacity", 0.8); // 起点透明度

    // 渐变终点颜色
    ringGradient.append("stop")
        .attr("offset", "100%") // 终点位置
        .attr("stop-color", "#B0C4DE") // 终点颜色
        .attr("stop-opacity", 0); // 终点透明度

    // 绘制一个背景圆，作为地图的背景
    svg.append("circle")
        .attr("cx", c_x)
        .attr("cy", c_y)
        .attr("r", c_r)
        .attr("fill", "#f7f8fb"); // 背景圆的颜色
 
    // 绘制一个渐变环，覆盖在地图外层
    svg.append("circle")
        .attr("cx", c_x)
        .attr("cy", c_y + 5) // 偏移 5 以增加视觉效果
        .attr("r", c_r + 20) // 半径比背景圆大 20
        .attr("fill", "none")
        .attr("stroke", "url(#ring-gradient)") // 应用定义的渐变
        .attr("stroke-width", 10); // 环的宽度

    // 调用 dataLoader 获取预处理数据
    const { csvData, timePeriods, europeanCountryNames } = await dataLoader.processData();

    // 创建年份选择器
    dataLoader.createYearSelector(timePeriods, "#text .radio-container");

    // 创建字段选择器
    dataLoader.createFieldSelector(["Gross_electricity_production", "Final_consumption"], "#text .button-container", "Gross_electricity_production");

    // 加载国家地理数据（GeoJSON 文件）
    const worldData = await d3.json("../data/countries.geojson");

    // 创建投影，用于将地理坐标转换为屏幕坐标
    const projection = d3.geoMercator()
        .center([20, 55]) // 设置地图中心经纬度
        .scale(200) // 缩放比例
        .translate([c_x + 20, c_y]); // 平移调整

    // 创建地理路径生成器
    const path = d3.geoPath().projection(projection);

    // 创建一个组元素，并应用剪辑路径
    const clippedGroup = svg.append("g")
        .attr("clip-path", "url(#circle-clip)");

    // 绘制地图背景
    clippedGroup.selectAll(".background-path")
        .data(worldData.features) // 绑定 GeoJSON 数据
        .enter()
        .append("path") // 绘制路径
        .attr("class", "background-path")
        .attr("d", path) // 根据地理数据生成路径
        .attr("fill", "#d3d3d3") // 填充颜色
        .attr("stroke", "#e9e9e9") // 边界颜色
        .attr("stroke-width", 0.5) // 边界线宽度（1px）
        .attr("fill-opacity", 0.3); // 填充透明度

    // 筛选欧洲国家的地理数据
    const europeanCountries = worldData.features.filter(d =>
        europeanCountryNames.includes(d.properties.ADMIN)
    );

    // 定义更新地图的函数，渲染选定年份和字段的数据
    function updateMap() {
        const selectedYear = dataLoader.getSelectedYear(); // 动态获取选中年份
        let selectedField = dataLoader.getSelectedField(); // 动态获取选中字段

        // 如果未选择任何字段，设置默认字段
        if (!selectedField) {
            selectedField = "Gross_electricity_production";
        }

        // 筛选数据并获取映射
        const { countryMap, values } = dataLoader.filterDataByYearAndField(
            csvData,
            selectedYear,
            selectedField,
            europeanCountryNames
        );

        // 自定义颜色比例尺：低值浅蓝 -> 中值深蓝 -> 高值红色
        const colorScale = d3.scaleLinear()
            .domain([d3.min(values), (d3.min(values) + d3.max(values)) / 2, d3.max(values)])
            .range(["#89CFF0", "#00008B", "#4B0082"]);

        // 更新地图
        clippedGroup.selectAll(".europe-path")
            .data(europeanCountries)
            .join(
                enter => enter.append("path")
                    .attr("class", "europe-path")
                    .attr("d", path)
                    .attr("fill", d => {
                        const value = countryMap.get(d.properties.ADMIN);
                        return value > 0 ? colorScale(value) : "#ccc";
                    })
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 0.5) // 边界线宽度（1px）
                    .on("mouseover", function (event, d) {
                        const value = countryMap.get(d.properties.ADMIN);
                        if (value > 0) {
                            const currentColor = d3.color(colorScale(value));
                            d3.select(this).attr("fill", currentColor.brighter(1.5));
                        }
                    })
                    .on("mouseout", function (event, d) {
                        const value = countryMap.get(d.properties.ADMIN);
                        d3.select(this).attr("fill", value > 0 ? colorScale(value) : "#ccc");
                    })
                    .append("title")
                    .text(d => {
                        const value = countryMap.get(d.properties.ADMIN);
                        return `${d.properties.ADMIN || d.properties.name}: ${selectedField.replace("_", " ")} = ${value ? value.toFixed(2) : "No Data"}`;
                    }),
                update => update // 更新部分重新绑定事件
                    .attr("fill", d => {
                        const value = countryMap.get(d.properties.ADMIN);
                        return value > 0 ? colorScale(value) : "#ccc";
                    })
                    .on("mouseover", function (event, d) {
                        const value = countryMap.get(d.properties.ADMIN);
                        if (value > 0) {
                            const currentColor = d3.color(colorScale(value));
                            d3.select(this).attr("fill", currentColor.brighter(1.5));
                        }
                    })
                    .on("mouseout", function (event, d) {
                        const value = countryMap.get(d.properties.ADMIN);
                        d3.select(this).attr("fill", value > 0 ? colorScale(value) : "#ccc");
                    })
                    .select("title")
                    .text(d => {
                        const value = countryMap.get(d.properties.ADMIN);
                        return `${d.properties.ADMIN || d.properties.name}: ${selectedField.replace("_", " ")} = ${value ? value.toFixed(2) : "No Data"}`;
                    })
            );
    }

    // 初次加载时更新地图
    updateMap();

    // 绑定年份选择事件，更新地图
    // 绑定年份选择事件，更新地图和柱状图
    d3.selectAll("input[name='yearRadio']").on("change", function () {
        updateMap();        // 更新地图
        if (typeof updateBarChart === "function") {
            updateBarChart(); // 更新柱状图（确保函数已定义）
        }
    });


    // 绑定字段按钮点击事件，更新地图
    d3.selectAll(".button-container button").on("click", function () {
        d3.selectAll(".button-container button").classed("active", false); // 移除其他按钮的活动状态
        d3.select(this).classed("active", true); // 设置当前按钮为活动状态
        updateMap(); // 更新地图
        updateBarChart();
    });
});
