// 定义一个 dataLoader 对象，包含所有与数据加载和处理相关的功能
const dataLoader = {
    // 数据文件路径
    dataPaths: {
        csv: "../data/EU_with_Final_Consumption&Gross_electricity_production.csv" // CSV 文件的路径
    },

    // 加载 CSV 数据的方法
    loadCSV: function () {
        // 使用 D3 的 d3.csv() 加载 CSV 文件，返回一个 Promise
        return d3.csv(this.dataPaths.csv);
    },

    // 动态获取所有欧洲国家的名称
    getEuropeanCountries: async function () {
        // 调用 loadCSV() 方法加载数据
        const csvData = await this.loadCSV();
        // 从数据中提取 geo 字段的唯一值（国家名称）
        const uniqueCountries = Array.from(new Set(csvData.map(d => d.geo)));
        // console.log(uniqueCountries);
        return uniqueCountries; // 返回唯一的国家名称数组
    // 数据预处理函数，返回预处理后的数据
    },
    
    processData: async function () {
        // 加载 CSV 数据
        const csvData = await this.loadCSV();
        // 动态获取所有欧洲国家名称
        const europeanCountryNames = await this.getEuropeanCountries();

        // 按年份分组数据，将 TIME_PERIOD 作为分组键
        const groupedData = d3.group(csvData, d => d.TIME_PERIOD);
        // 提取所有年份作为数组
        const timePeriods = Array.from(groupedData.keys());

        // 返回加载和处理后的数据
        return {
            csvData, // 原始 CSV 数据
            timePeriods, // 年份数组
            europeanCountryNames // 欧洲国家名称数组
        };
    },

    // 生成年份选择器的方法
    createYearSelector: function (timePeriods, containerSelector) {
        // 使用 d3 选择指定的容器
        const container = d3.select(containerSelector);
        // 遍历年份数组，为每个年份生成一个单选按钮
        timePeriods.forEach((period) => {
            // 检查当前年份是否为默认选中的年份
            const isChecked = period === "2014";
            // 创建单选按钮的容器
            const radioItem = container.append("div").attr("class", "radio-item");
            // 添加 input 元素（单选按钮）
            radioItem.append("input")
                .attr("type", "radio") // 设置为单选按钮
                .attr("name", "yearRadio") // 分组名称，确保互斥
                .attr("value", period) // 设置年份为按钮的值
                .attr("id", `radio-${period}`) // 设置唯一 ID
                .attr("checked", isChecked ? true : null); // 如果是默认年份，设置为选中状态
            // 添加 label 元素，显示年份文本
            radioItem.append("label")
                .attr("for", `radio-${period}`) // 关联单选按钮
                .text(period); // 设置标签文本为年份
        });
    },

    // 生成字段选择器的方法
    createFieldSelector: function (fields, containerSelector, defaultField) {
        // 使用 d3 选择指定的容器
        const container = d3.select(containerSelector);

        // 遍历字段数组，为每个字段生成一个按钮
        fields.forEach((field) => {
            const button = container.append("button") // 添加按钮元素
                .attr("id", field) // 设置按钮的 ID 为字段名
                .classed("active", field === defaultField) // 如果字段是默认字段，添加 'active' 类
                .text(field.replace("_", " ")); // 将字段名格式化为更易读的形式
        });
    },

    // 获取当前选定的年份
    getSelectedYear: function () {
        // 使用 document.querySelector 获取选中的单选按钮
        const selected = document.querySelector("input[name='yearRadio']:checked");
        // 如果选中，返回其值（年份）；否则返回 null
        return selected ? selected.value : "2014";
    },

    // 获取当前选定的字段
    getSelectedField: function () {
        // 使用 d3 选择具有 'active' 类的按钮
        const activeButton = d3.select("button.active");
        // 如果没有活动按钮，返回 null；否则返回按钮的 ID（字段名）
        return activeButton.empty() ? null : activeButton.attr("id");
    },
     // 根据年份和字段筛选数据的方法
     filterDataByYearAndField: function (csvData, year, field, europeanCountryNames) {
        // 筛选指定年份的数据
        const yearData = csvData.filter(d => d.TIME_PERIOD === year);
        // 从该年份中筛选属于欧洲国家的数据
        const countryData = yearData.filter(d => europeanCountryNames.includes(d.geo));

        // 处理数据，将 geo 和指定字段值提取，并过滤掉无效值（值 <= 0）
        const processedData = countryData.map(d => ({
            country: d.geo,
            value: +d[field] // 转换字段值为数值
        })).filter(d => d.value > 0); // 只保留有效值

        // 创建一个国家到字段值的映射
        const countryMap = new Map(processedData.map(d => [d.country, d.value]));
        // 提取字段值数组
        const values = processedData.map(d => d.value);
        console.log(countryMap,values);//------------------------------------------------------------------------
        // 返回国家映射和字段值数组
        return { countryMap, values };
    }
};
