// 用于根据选中的年份和字段更新动态文本的函数
async function updateDynamicText() {
    try {
        // 加载并处理数据
        const { csvData, timePeriods, europeanCountryNames } = await dataLoader.processData();
        
        // 获取当前选中的年份和字段
        const currentYear = dataLoader.getSelectedYear();
        const currentField = dataLoader.getSelectedField();
        
        // 根据当前选中的年份和字段过滤数据
        const { countryMap, values } = dataLoader.filterDataByYearAndField(
            csvData, 
            currentYear, 
            currentField, 
            europeanCountryNames
        );
        
        // 找到具有最高值的国家
        let maxValue = Math.max(...values); // 获取数值数组中的最大值
        const topCountry = Array.from(countryMap.entries()) // 遍历国家映射
            .find(([country, value]) => value === maxValue)[0]; // 找到数值等于最大值的国家，并提取其名称
        
        // 根据选中的字段确定文本描述
        const fieldDescription = currentField.includes('Final_Consumption') 
            ? 'electricity consumption' // 如果字段名包含 'Final_Consumption'，表示是电力消耗
            : 'electricity generation'; // 否则表示是电力生产
        
        // 更新指定元素中的文本
        const countryElement = document.getElementById('Dynamic_Country'); // 获取显示国家名称的元素
        const descriptionElement = document.getElementById('Dynamic_Description'); // 获取显示描述的元素
        
        // 设置文本内容
        countryElement.textContent = topCountry; // 设置国家名称
        descriptionElement.textContent = ` was the country with the highest ${fieldDescription} in ${currentYear}`; // 设置描述文本
    } catch (error) {
        // 捕获并在控制台中打印更新动态文本时的错误
        console.error('Error updating dynamic text:', error);
    }
}

// 添加事件监听器，用于年份选择按钮和字段选择按钮
function setupDynamicTextListeners() {
    // 监听年份单选按钮的变化
    document.querySelectorAll('input[name="yearRadio"]').forEach(radio => {
        radio.addEventListener('change', updateDynamicText); // 当年份单选按钮变化时，调用 updateDynamicText 函数
    });
    
    // 监听字段选择按钮的点击事件
    document.querySelectorAll('#field-selector button').forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的 'active' 类
            document.querySelectorAll('#field-selector button').forEach(btn => {
                btn.classList.remove('active');
            });
            // 为点击的按钮添加 'active' 类
            this.classList.add('active');
            // 调用 updateDynamicText 函数以更新动态文本
            updateDynamicText();
        });
    });
}

// 页面加载完成后初次调用以设置动态文本
document.addEventListener('DOMContentLoaded', async () => {
    await updateDynamicText(); // 首次加载时更新动态文本
    setupDynamicTextListeners(); // 设置事件监听器
});
