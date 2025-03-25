/**
 * Ember Mug State Model
 * 
 * Manages the state data for the Ember Mug Card and provides
 * helper methods for calculating derived values.
 */
export class EmberMugState {
    constructor() {
        // Core properties
        this.temperature = 0;
        this.targetTemperature = 0;
        this.batteryLevel = 0;
        this.liquidLevel = 0;
        this.state = 'unknown';
        this.ledColor = '#ffffff';
        this.ledColorHex = '#ffffff';
        this.temperatureControl = false;
        this.temperaturePreset = '';
        this.isCharging = false;
        this.mugName = 'Ember Mug';
        this.temperatureUnit = 'C'; // Default unit, will be updated from entity

        // Cached / calculated properties
        this.minTemp = 50;
        this.maxTemp = 65;
        this.presetOptions = [];

        // Pending updates for optimistic UI
        this.pendingTargetTemp = null;
        this.pendingLedColor = null;
    }

    /**
     * Update the state object with new values
     * @param {Object} newState - Object with updated properties
     */
    update(newState) {
        // Validation - ensure newState is an object
        if (!newState || typeof newState !== 'object') return;

        // Handle special properties with pending values first
        this._updatePendingProperties(newState);

        // Update all regular properties
        this._updateRegularProperties(newState);

        // Update calculated/derived properties
        this._updateCalculatedProperties(newState);
    }

    /**
     * Update properties that may have pending values
     * @private
     * @param {Object} newState - Object with updated properties
     */
    _updatePendingProperties(newState) {
        // Handle target temperature with pending value
        if ('targetTemperature' in newState) {
            // Only update if there's no pending value or if values are close (optimistic update succeeded)
            if (this.pendingTargetTemp === null ||
                Math.abs(this.pendingTargetTemp - newState.targetTemperature) < 0.1) {
                this.targetTemperature = newState.targetTemperature;
                this.pendingTargetTemp = null;
            }
        }

        // Handle LED colors with pending value
        if (this.pendingLedColor === null) {
            // Update LED color if provided
            if ('ledColorHex' in newState) {
                this.ledColorHex = newState.ledColorHex;
            }
            if ('ledColor' in newState) {
                this.ledColor = newState.ledColor;
            }
        }
    }

    /**
     * Update regular properties that don't have special handling
     * @private
     * @param {Object} newState - Object with updated properties
     */
    _updateRegularProperties(newState) {
        // List of properties to skip (those with special handling)
        const skipProps = ['targetTemperature', 'ledColor', 'ledColorHex', 'presetOptions', 'minTemp', 'maxTemp'];

        // Update regular properties
        Object.entries(newState).forEach(([key, value]) => {
            if (!skipProps.includes(key) && value !== undefined) {
                this[key] = value;
            }
        });
    }

    /**
     * Update calculated or derived properties
     * @private
     * @param {Object} newState - Object with updated properties
     */
    _updateCalculatedProperties(newState) {
        // Update preset options if provided
        if (Array.isArray(newState.presetOptions)) {
            this.presetOptions = [...newState.presetOptions];
        }

        // Update temperature limits if provided
        if (typeof newState.minTemp === 'number') {
            this.minTemp = newState.minTemp;
        }

        if (typeof newState.maxTemp === 'number') {
            this.maxTemp = newState.maxTemp;
        }

        // Update temperature unit if provided
        if (newState.temperatureUnit && ['C', 'F'].includes(newState.temperatureUnit)) {
            this.temperatureUnit = newState.temperatureUnit;
        }
    }

    /**
     * Set pending target temperature for optimistic updates
     * @param {number} temp - New target temperature
     */
    setPendingTargetTemp(temp) {
        this.pendingTargetTemp = temp;
        this.targetTemperature = temp; // Optimistic update
    }

    /**
     * Set pending LED color for optimistic updates
     * @param {string} color - New LED color in hex format
     */
    setPendingLedColor(color) {
        this.pendingLedColor = color;
        this.ledColorHex = color; // Optimistic update
    }

    /**
     * Get the display temperature (accounts for pending values)
     * @returns {number} - The temperature to display
     */
    get displayTargetTemp() {
        return this.pendingTargetTemp !== null ?
            this.pendingTargetTemp : this.targetTemperature;
    }

    /**
     * Get the display LED color (accounts for pending values)
     * @returns {string} - The color to display
     */
    get displayLedColor() {
        return this.pendingLedColor || this.ledColorHex;
    }

    /**
     * Get temperature unit for display
     * @returns {string} - Temperature unit symbol (°C or °F)
     */
    getTemperatureUnitSymbol() {
        return `°${this.temperatureUnit}`;
    }

    /**
     * Get icon name based on mug state
     * @returns {string} - Icon name
     */
    getStateIcon() {
        switch (this.state) {
            case 'heating':
                return 'mdi:thermometer-chevron-up';
            case 'cooling':
                return 'mdi:thermometer-chevron-down';
            case 'perfect':
                return 'mdi:check-circle-outline';
            case 'empty':
                return 'mdi:coffee-off-outline';
            case 'filling':
                return 'mdi:coffee';
            case 'standby':
                return 'mdi:power-sleep';
            case 'cold_no_control':
                return 'mdi:snowflake';
            case 'warm_no_control':
                return 'mdi:heat-wave';
            default:
                return 'mdi:help-circle-outline';
        }
    }

    /**
     * Get color for state visualization
     * @returns {string} - Color code
     */
    getStateColor() {
        switch (this.state) {
            case 'heating':
                return '#ff5722';
            case 'cooling':
                return '#2196f3';
            case 'perfect':
                return '#4caf50';
            case 'empty':
                return '#9e9e9e';
            case 'filling':
                return '#2196f3';
            case 'standby':
                return '#9e9e9e';
            case 'cold_no_control':
                return '#81d4fa';
            case 'warm_no_control':
                return '#ffb74d';
            default:
                return '#9e9e9e';
        }
    }

    /**
     * Get battery icon based on level and charging state
     * @returns {string} - Icon name
     */
    getBatteryIcon() {
        if (this.isCharging) {
            return 'mdi:battery-charging';
        }

        if (this.batteryLevel > 90) {
            return 'mdi:battery';
        } else if (this.batteryLevel > 70) {
            return 'mdi:battery-80';
        } else if (this.batteryLevel > 50) {
            return 'mdi:battery-60';
        } else if (this.batteryLevel > 30) {
            return 'mdi:battery-40';
        } else if (this.batteryLevel > 10) {
            return 'mdi:battery-20';
        } else {
            return 'mdi:battery-outline';
        }
    }

    /**
     * Get liquid level icon
     * @returns {string} - Icon name
     */
    getLiquidLevelIcon() {
        if (this.liquidLevel > 10) {
            return 'mdi:coffee';
        } else if (this.liquidLevel > 0) {
            return 'mdi:coffee-outline';
        } else {
            return 'mdi:coffee-off-outline';
        }
    }
}
