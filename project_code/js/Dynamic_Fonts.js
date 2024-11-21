// Function to update the dynamic text based on selected year and field
async function updateDynamicText() {
    try {
        // Load and process the data
        const { csvData, timePeriods, europeanCountryNames } = await dataLoader.processData();
        
        // Get currently selected year and field
        const currentYear = dataLoader.getSelectedYear();
        const currentField = dataLoader.getSelectedField();
        
        // Filter data based on current selection
        const { countryMap, values } = dataLoader.filterDataByYearAndField(
            csvData, 
            currentYear, 
            currentField, 
            europeanCountryNames
        );
        
        // Find the country with the highest value
        let maxValue = Math.max(...values);
        const topCountry = Array.from(countryMap.entries())
            .find(([country, value]) => value === maxValue)[0];
        
        // Determine the text description based on the selected field
        const fieldDescription = currentField.includes('Final_Consumption') 
            ? 'electricity consumption' 
            : 'electricity generation';
        
        // Update the text in the specified elements
        const countryElement = document.getElementById('Dynamic_Country');
        const descriptionElement = document.getElementById('Dynamic_Description');
        
        countryElement.textContent = topCountry;
        descriptionElement.textContent = ` was the country with the highest ${fieldDescription} in ${currentYear}`;
    } catch (error) {
        console.error('Error updating dynamic text:', error);
    }
}

// Add event listeners to year radio buttons and field selection buttons
function setupDynamicTextListeners() {
    // Listen to year radio button changes
    document.querySelectorAll('input[name="yearRadio"]').forEach(radio => {
        radio.addEventListener('change', updateDynamicText);
    });
    
    // Listen to field selection button clicks
    document.querySelectorAll('#field-selector button').forEach(button => {
        button.addEventListener('click', function() {
            // Remove 'active' class from all buttons
            document.querySelectorAll('#field-selector button').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add 'active' class to clicked button
            this.classList.add('active');
            updateDynamicText();
        });
    });
}

// Initial call to set up the text when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await updateDynamicText();
    setupDynamicTextListeners();
});
