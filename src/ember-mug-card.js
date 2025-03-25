import { EmberMugState } from "./models/ember-mug-state.js";

// Get HA's LitElement instead of importing from CDN
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const { html, css } = LitElement.prototype;

/**
 * Ember Mug Card for Home Assistant
 * 
 * A custom Lovelace card that provides visualization and controls
 * for Ember Mug devices.
 * 
 * @customElement ember-mug-card
 * @litElement
 */
export class EmberMugCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  constructor() {
    super();
    this.config = {};
    this._mugState = new EmberMugState();
    this._entities = {};
    
    // Track if entities have been initialized
    this._entitiesInitialized = false;
    
    // Store entity data for change detection
    this._entityCache = {};
    
    // Store previous base entity to detect changes
    this._previousBaseEntity = null;
    
    // Animation frame ID for resize handling
    this._resizeFrame = null;
    this._isResizing = false;
    
    // Create resize observer
    this._resizeObserver = new ResizeObserver(() => this._handleResize());

    // Generate a unique ID for this card instance
    this._cardId = Math.random().toString(36).substring(2, 15);
  }

  /**
   * Called when the element is added to the DOM
   */
  connectedCallback() {
    super.connectedCallback();
    
    // Listen for scale preview events
    this.addEventListener('scale-preview', this._handleScalePreview.bind(this));
    
    // Observe the card container for resize events
    setTimeout(() => {
      const container = this.shadowRoot.querySelector('.card-container');
      if (container) {
        this._resizeObserver.observe(container);
      }
    }, 10);
  }

  /**
   * Called when the element is removed from the DOM
   */
  disconnectedCallback() {
    // Remove scale preview event listener
    this.removeEventListener('scale-preview', this._handleScalePreview.bind(this));
    
    // Clean up resize observer
    this._resizeObserver.disconnect();
    
    // Cancel any pending animation frame
    if (this._resizeFrame) {
      cancelAnimationFrame(this._resizeFrame);
      this._resizeFrame = null;
    }
    
    super.disconnectedCallback();
  }

  /**
   * Sets configuration and validates
   * @param {Object} config - Card configuration
   */
  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    
    // Apply default configuration
    this.config = {
      show_current_temp: true,
      show_target_temp: true,
      show_temp_control: true,
      show_liquid_level: true,
      show_battery: true,
      show_led: true,
      show_state: true,
      show_title: true,
      show_presets: true,
      show_visual: true,
      layout: 'default',
      mug_scale: 1.0,
      ...config
    };
    
    // Set layout attribute for styling
    if (this.config.layout) {
      this.setAttribute('layout', this.config.layout);
    }
  }

  /**
   * Handle property updates
   * @param {Map} changedProps - Changed properties
   */
  updated(changedProps) {
    // Special handling for specific changes
    if (changedProps.has("config")) {
      // When configuration changes, update layout and styling
      if (this.config?.layout) {
        this.setAttribute('layout', this.config.layout);
      }
    }
    
    // Only update entities if:
    // 1. hass has changed
    // 2. We have necessary data
    if (changedProps.has("hass") && this.hass && this.config) {
      const baseEntityId = this.config.entity;
      const baseEntityChanged = this._previousBaseEntity !== baseEntityId;
      
      if (!this._entitiesInitialized || baseEntityChanged) {
        // Initialize or reinitialize all entity references
        this._initializeEntities();
      } else {
        // Check for state changes in any of our tracked entities
        this._processStateChanges();
      }
    }
  }

  /**
   * Get the device_id associated with an entity
   * @private
   * @param {string} entityId - Entity ID
   * @returns {string|null} - Device ID if found, null otherwise
   */
  _getDeviceIdFromEntity(entityId) {
    if (!this.hass || !entityId) return null;
    
    try {
      // In Home Assistant, entity registry entries can be accessed through hass.devices
      const entityRegistry = this.hass.entities || {};
      const entity = entityRegistry[entityId];
      
      // Check if we have device_id directly from entity registry
      if (entity && entity.device_id) {
        return entity.device_id;
      }
      
      // Alternative method: check if entity state has device_id in attributes
      const entityState = this.hass.states[entityId];
      if (entityState && entityState.attributes && entityState.attributes.device_id) {
        return entityState.attributes.device_id;
      }
    } catch (error) {
      console.warn(`Ember Mug Card: Error getting device_id for entity "${entityId}":`, error);
    }
    
    return null;
  }

  /**
   * Find all entities that belong to the same device
   * @private
   * @param {string} deviceId - Device ID
   * @returns {string[]} - Array of entity IDs belonging to the device
   */
  _findDeviceEntities(deviceId) {
    if (!this.hass || !deviceId) return [];
    
    const entities = [];
    
    try {
      // Method 1: Use entity registry if available
      if (this.hass.entities) {
        for (const [entityId, entity] of Object.entries(this.hass.entities)) {
          if (entity.device_id === deviceId) {
            entities.push(entityId);
          }
        }
      }
      
      // Method 2: Check device_id in entity attributes (fallback)
      if (entities.length === 0) {
        for (const [entityId, state] of Object.entries(this.hass.states)) {
          if (state.attributes && state.attributes.device_id === deviceId) {
            entities.push(entityId);
          }
        }
      }
    } catch (error) {
      console.error('Ember Mug Card: Error finding device entities:', error);
    }
    
    return entities;
  }

  /**
   * Initialize entity references from base entity
   * @private
   */
  _initializeEntities() {
    const baseEntityId = this.config.entity;
    
    // Skip if base entity doesn't exist
    if (!this.hass.states[baseEntityId]) {
      console.warn(`Ember Mug Card: Base entity "${baseEntityId}" not found`);
      return;
    }
    
    // Try to find device_id for the entity
    const deviceId = this._getDeviceIdFromEntity(baseEntityId);
    
    if (deviceId) {
      // Use device relationship method
      console.info(`Ember Mug Card: Found device_id ${deviceId} for "${baseEntityId}"`);
      this._initializeEntitiesFromDevice(deviceId);
    } else {
      // Fallback to string-based method
      console.info(`Ember Mug Card: No device relationship found for "${baseEntityId}", using string-based method`);
      this._initializeEntitiesFromString(baseEntityId);
    }
    
    // Clear entity cache
    this._entityCache = {};
    
    // Save the base entity for change detection
    this._previousBaseEntity = baseEntityId;
    
    // Mark as initialized
    this._entitiesInitialized = true;
    
    // Initialize cached state and update
    this._cacheCurrentEntityStates();
    this._updateState();
  }

  /**
   * Initialize entities using device relationships
   * @private
   * @param {string} deviceId - Device ID
   */
  _initializeEntitiesFromDevice(deviceId) {
    // Empty entities object to start
    this._entities = {};
    
    try {
      // Get all entities for this device
      const deviceEntities = this._findDeviceEntities(deviceId);
      
      if (deviceEntities.length === 0) {
        console.warn(`Ember Mug Card: No entities found for device ${deviceId}`);
        this._initializeEntitiesFromString(this.config.entity);
        return;
      }
      
      // Map to store entities by domain for easier lookup
      const entitiesByDomain = {};
      
      // Group entities by domain
      deviceEntities.forEach(entityId => {
        const [domain, name] = entityId.split('.');
        if (!entitiesByDomain[domain]) entitiesByDomain[domain] = [];
        entitiesByDomain[domain].push(entityId);
      });
      
      // Find entities by domain and specific function
      this._entities.temperature = this._findEntityByKeywords(entitiesByDomain.sensor, ['current_temp', 'temperature']);
      this._entities.targetTemp = this._findEntityByKeywords(entitiesByDomain.number, ['target_temp']);
      this._entities.battery = this._findEntityByKeywords(entitiesByDomain.sensor, ['battery_percent', 'battery']);
      this._entities.liquidLevel = this._findEntityByKeywords(entitiesByDomain.sensor, ['liquid_level']);
      this._entities.state = this._findEntityByKeywords(entitiesByDomain.sensor, ['state']);
      this._entities.led = this._findEntityByKeywords(entitiesByDomain.light, ['led']);
      this._entities.tempControl = this._findEntityByKeywords(entitiesByDomain.switch, ['temperature_control', 'temp_control']);
      this._entities.tempPreset = this._findEntityByKeywords(entitiesByDomain.select, ['temperature_preset', 'temp_preset']);
      this._entities.name = this._findEntityByKeywords(entitiesByDomain.text, ['name']);
      this._entities.power = this._findEntityByKeywords(entitiesByDomain.binary_sensor, ['power', 'charging']);
      
      // Check if we found all required entities
      if (!this._entities.temperature || !this._entities.state) {
        console.warn(`Ember Mug Card: Could not find all required entities via device relationship`);
        
        // Fallback to string-based method for missing entities
        const missingEntities = this._validateAndFillMissingEntities();
        if (missingEntities.length > 0) {
          console.warn(`Ember Mug Card: Missing entities: ${missingEntities.join(', ')}`);
        }
      }
      
      console.debug('Ember Mug Card: Initialized entities via device relationship:', this._entities);
    } catch (error) {
      console.error('Ember Mug Card: Error initializing entities from device:', error);
      // Fallback to string-based method
      this._initializeEntitiesFromString(this.config.entity);
    }
  }

  /**
   * Find an entity by keywords in its name
   * @private
   * @param {string[]} entities - Array of entity IDs to search
   * @param {string[]} keywords - Keywords to look for
   * @returns {string|null} - Entity ID if found, null otherwise
   */
  _findEntityByKeywords(entities, keywords) {
    if (!entities || !Array.isArray(entities) || entities.length === 0) return null;
    
    // Try exact match first
    for (const keyword of keywords) {
      const exact = entities.find(entity => entity.includes(keyword));
      if (exact) return exact;
    }
    
    // Fallback to any entity in the domain if only one exists
    if (entities.length === 1) return entities[0];
    
    return null;
  }

  /**
   * Initialize entities using string manipulation (fallback method)
   * @private
   * @param {string} baseEntityId - Base entity ID
   */
  _initializeEntitiesFromString(baseEntityId) {
    try {
      // Extract device ID from entity
      const baseEntityParts = baseEntityId.split('.');
      if (baseEntityParts.length !== 2) {
        console.warn(`Ember Mug Card: Invalid entity format: "${baseEntityId}"`);
        return;
      }
      
      const baseEntityName = baseEntityParts[1];
      const devicePrefix = baseEntityName.substring(0, baseEntityName.lastIndexOf('_'));
      
      // Store entity references
      this._entities = {
        temperature: `sensor.${devicePrefix}_current_temp`,
        targetTemp: `number.${devicePrefix}_target_temp`,
        battery: `sensor.${devicePrefix}_battery_percent`,
        liquidLevel: `sensor.${devicePrefix}_liquid_level`,
        state: `sensor.${devicePrefix}_state`,
        led: `light.${devicePrefix}_led`,
        tempControl: `switch.${devicePrefix}_temperature_control`,
        tempPreset: `select.${devicePrefix}_temperature_preset`,
        name: `text.${devicePrefix}_name`,
        power: `binary_sensor.${devicePrefix}_power`
      };
      
      // Validate entities and log warnings for missing ones
      this._validateAndFillMissingEntities();
      
      console.debug('Ember Mug Card: Initialized entities via string manipulation:', this._entities);
    } catch (error) {
      console.error('Ember Mug Card: Error initializing entities from string:', error);
    }
  }

  /**
   * Validate entities and fill missing ones with null
   * @private
   * @returns {string[]} - Array of missing entity keys
   */
  _validateAndFillMissingEntities() {
    const missingEntities = [];
    
    for (const [key, entityId] of Object.entries(this._entities)) {
      if (!entityId || !this.hass.states[entityId]) {
        if (entityId) {
          console.warn(`Ember Mug Card: Entity "${entityId}" not found`);
        }
        missingEntities.push(key);
      }
    }
    
    return missingEntities;
  }

  /**
   * Cache current entity states for change detection
   * @private
   */
  _cacheCurrentEntityStates() {
    if (!this._entitiesInitialized || !this.hass) return;
    
    Object.entries(this._entities).forEach(([key, entityId]) => {
      if (entityId && this.hass.states[entityId]) {
        const entity = this.hass.states[entityId];
        this._entityCache[entityId] = {
          state: entity.state,
          attributes: JSON.stringify(entity.attributes)
        };
      }
    });
  }

  /**
   * Process state changes from Home Assistant
   * @private
   */
  _processStateChanges() {
    if (!this._entitiesInitialized || !this.hass) return;
    
    let hasChanges = false;
    
    // Check each tracked entity for changes
    Object.entries(this._entities).forEach(([key, entityId]) => {
      if (!entityId || !this.hass.states[entityId]) return;
      
      const entity = this.hass.states[entityId];
      const cachedState = this._entityCache[entityId];
      
      // Skip if we don't have a cached state yet
      if (!cachedState) {
        this._entityCache[entityId] = {
          state: entity.state,
          attributes: JSON.stringify(entity.attributes)
        };
        hasChanges = true;
        return;
      }
      
      // Check if state or attributes changed
      const attributesStr = JSON.stringify(entity.attributes);
      if (cachedState.state !== entity.state || cachedState.attributes !== attributesStr) {
        // Update cache
        this._entityCache[entityId] = {
          state: entity.state,
          attributes: attributesStr
        };
        hasChanges = true;
      }
    });
    
    // If changes detected, update state
    if (hasChanges) {
      // Force a full state update for reactivity
      this._updateState();
      
      // Force visualization update after a small delay to ensure DOM updates
      const visualization = this.shadowRoot.querySelector('ember-mug-visualization');
      if (visualization) {
        setTimeout(() => visualization.forceUpdate(), 50);
      }
    }
  }

  /**
   * Update state from current entity values
   * @private
   */
  _updateState() {
    if (!this._entitiesInitialized || !this.hass) return;
    
    try {
      // Store the previous state for comparison
      const previousState = { ...this._mugState };
      
      // Prepare new state values
      const newState = this._buildStateFromEntities();
      
      // Update the state using the enhanced update method
      this._mugState.update(newState);
      
      // Force visualization update if specific properties changed
      const visualization = this.shadowRoot.querySelector('ember-mug-visualization');
      if (visualization) {
        const shouldForceUpdate = 
          previousState.temperature !== this._mugState.temperature ||
          previousState.liquidLevel !== this._mugState.liquidLevel ||
          previousState.state !== this._mugState.state ||
          previousState.ledColorHex !== this._mugState.ledColorHex;
        
        if (shouldForceUpdate) {
          // Use a small delay to ensure the state is fully updated
          setTimeout(() => visualization.forceUpdate(), 10);
        }
      }
    } catch (error) {
      console.error('Ember Mug Card: Error updating state:', error);
    }
    
    // Request update
    this.requestUpdate();
  }

  /**
   * Build a new state object from entity values
   * @private
   * @returns {Object} - State object with values from entities
   */
  _buildStateFromEntities() {
    // Get entity states, safely handling missing entities
    const temperatureEntity = this._getEntityState('temperature');
    const targetTempEntity = this._getEntityState('targetTemp');
    const batteryEntity = this._getEntityState('battery');
    const liquidLevelEntity = this._getEntityState('liquidLevel');
    const stateEntity = this._getEntityState('state');
    const ledEntity = this._getEntityState('led');
    const tempControlEntity = this._getEntityState('tempControl');
    const tempPresetEntity = this._getEntityState('tempPreset');
    const nameEntity = this._getEntityState('name');
    const powerEntity = this._getEntityState('power');
    
    // Build new state object
    const newState = {
      temperature: this._getEntityValue(temperatureEntity),
      targetTemperature: this._getEntityValue(targetTempEntity),
      batteryLevel: this._getEntityValue(batteryEntity),
      liquidLevel: this._getEntityValue(liquidLevelEntity),
      state: stateEntity ? stateEntity.state : 'unknown',
      temperatureControl: tempControlEntity ? tempControlEntity.state === 'on' : false,
      temperaturePreset: tempPresetEntity ? tempPresetEntity.state : '',
      isCharging: powerEntity ? powerEntity.state === 'on' : false,
      mugName: nameEntity ? nameEntity.state : 'Ember Mug'
    };
    
    // Extract temperature unit from entity attributes
    if (temperatureEntity && temperatureEntity.attributes && temperatureEntity.attributes.unit_of_measurement) {
      const unitString = temperatureEntity.attributes.unit_of_measurement;
      newState.temperatureUnit = unitString.includes('F') ? 'F' : 'C';
    } else if (targetTempEntity && targetTempEntity.attributes && targetTempEntity.attributes.unit_of_measurement) {
      const unitString = targetTempEntity.attributes.unit_of_measurement;
      newState.temperatureUnit = unitString.includes('F') ? 'F' : 'C';
    }
    
    // Handle LED color if available
    if (ledEntity && ledEntity.attributes.rgb_color) {
      const rgb = ledEntity.attributes.rgb_color;
      newState.ledColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      newState.ledColorHex = this._rgbToHex(rgb[0], rgb[1], rgb[2]);
    }
    
    // Store preset options if available
    if (tempPresetEntity && tempPresetEntity.attributes.options) {
      newState.presetOptions = tempPresetEntity.attributes.options;
    }
    
    // Get min/max temperatures from entity attributes
    if (targetTempEntity && targetTempEntity.attributes) {
      newState.minTemp = targetTempEntity.attributes.min || 50;
      newState.maxTemp = targetTempEntity.attributes.max || 65;
    }
    
    return newState;
  }

  /**
   * Handle resize events with requestAnimationFrame for better performance
   * @private
   */
  _handleResize() {
    // Skip if we're already handling a resize
    if (this._isResizing) return;
    
    // Mark that we're in the process of handling a resize
    this._isResizing = true;
    
    // Use requestAnimationFrame for smoother animations
    this._resizeFrame = requestAnimationFrame(() => {
      try {
        this._updateLayout();
      } catch (error) {
        console.error('Ember Mug Card: Error handling resize:', error);
      } finally {
        // Mark that we've finished handling this resize
        this._isResizing = false;
        this._resizeFrame = null;
      }
    });
  }

  /**
   * Update layout based on container size
   * @private
   */
  _updateLayout() {
    const container = this.shadowRoot.querySelector('.card-container');
    if (!container) return;
    
    // Get current container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Calculate layout adjustments here
    // ...
    
    // Update child components if needed
    const visualization = this.shadowRoot.querySelector('ember-mug-visualization');
    if (visualization) {
      visualization.requestUpdate();
    }
    
    const controls = this.shadowRoot.querySelector('ember-mug-controls');
    if (controls) {
      controls.requestUpdate();
    }
  }

  /**
   * Handle mug scale preview from the editor
   * @private
   * @param {CustomEvent} ev - Event with preview scale
   */
  _handleScalePreview(ev) {
    if (!ev.detail || typeof ev.detail.scale !== 'number') return;
    
    // Get the visualization component
    const visualization = this.shadowRoot.querySelector('ember-mug-visualization');
    if (visualization) {
      // Update scale for preview only (doesn't change config)
      visualization.scale = ev.detail.scale;
    }
  }
  
  /**
   * Get entity state with error handling
   * @private
   * @param {string} entityKey - Key in _entities object
   * @returns {Object|null} - Entity state object or null
   */
  _getEntityState(entityKey) {
    if (!this._entities[entityKey]) {
      return null;
    }
    
    const entityId = this._entities[entityKey];
    if (!this.hass.states[entityId]) {
      // Only log a warning on first attempt
      if (!this._entityCache[entityId]) {
        console.warn(`Ember Mug Card: Entity "${entityId}" not found in Home Assistant states`);
      }
      return null;
    }
    
    return this.hass.states[entityId];
  }

  /**
   * Safely extract value from entity
   * @private
   * @param {Object} entity - Home Assistant entity state
   * @returns {number} - Parsed value or 0
   */
  _getEntityValue(entity) {
    if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') {
      return 0;
    }
    return parseFloat(entity.state);
  }
  
  /**
   * Handle temperature control toggle event
   * @private
   */
  _handleTempControlToggle() {
    if (!this.hass || !this._entities.tempControl) return;
    
    const service = this._mugState.temperatureControl ? 'turn_off' : 'turn_on';
    
    // Optimistic update
    this._mugState.temperatureControl = !this._mugState.temperatureControl;
    this.requestUpdate();
    
    this.hass.callService('switch', service, {
      entity_id: this._entities.tempControl
    });
  }
  
  /**
   * Handle target temperature change event
   * @private
   * @param {CustomEvent} e - Event with temperature value
   */
  _handleTargetTempChange(e) {
    if (!this.hass || !this._entities.targetTemp) return;
    
    const temp = parseFloat(e.detail.value);
    
    // Update optimistically
    this._mugState.setPendingTargetTemp(temp);
    this.requestUpdate();
    
    this.hass.callService('number', 'set_value', {
      entity_id: this._entities.targetTemp,
      value: temp
    });
  }
  
  /**
   * Handle temperature preset selection event
   * @private
   * @param {CustomEvent} e - Event with preset value
   */
  _handlePresetSelect(e) {
    if (!this.hass || !this._entities.tempPreset) return;
    
    const preset = e.detail.value;
    
    // Update optimistically
    this._mugState.temperaturePreset = preset;
    this.requestUpdate();
    
    this.hass.callService('select', 'select_option', {
      entity_id: this._entities.tempPreset,
      option: preset
    });
  }
  
  /**
   * Handle LED color change event
   * @private
   * @param {CustomEvent} e - Event with color value
   */
  _handleLedColorChange(e) {
    if (!this.hass || !this._entities.led) return;
    
    const color = e.detail.value;
    
    // Update optimistically
    this._mugState.setPendingLedColor(color);
    this.requestUpdate();
    
    this.hass.callService('light', 'turn_on', {
      entity_id: this._entities.led,
      rgb_color: this._hexToRgb(color)
    });
  }
  
  /**
   * Convert hex color to RGB array
   * @private
   * @param {string} hex - Hex color string
   * @returns {number[]} - RGB array [r,g,b]
   */
  _hexToRgb(hex) {
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    return [
      (bigint >> 16) & 255,
      (bigint >> 8) & 255,
      bigint & 255
    ];
  }
  
  /**
   * Convert RGB to hex
   * @private
   * @param {number} r - Red value
   * @param {number} g - Green value
   * @param {number} b - Blue value
   * @returns {string} - Hex color string
   */
  _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Handle temperature slider movement (without submitting)
   * @private
   * @param {CustomEvent} e - Event with temperature value
   */
  _handleTempSliderMove(e) {
    // Just update visualization without sending to HA
    this._mugState.setPendingTargetTemp(e.detail.value);
    this.requestUpdate();
  }

  /**
   * Get size of card for layout
   * @returns {number} - Card size
   */
  getCardSize() {
    switch (this.config.layout) {
      case 'minimal':
        return 2;
      case 'compact':
        return 3;
      default:
        return 4;
    }
  }

  /**
   * Create configuration UI element
   * @returns {HTMLElement} - Editor element
   */
  static getConfigElement() {
    return document.createElement("ember-mug-card-editor");
  }

  /**
   * Get default configuration
   * @returns {Object} - Default config
   */
  static getStubConfig() {
    return {
      entity: "sensor.ember_mug_state",
      layout: 'default',
      mug_scale: 1.0,
      show_current_temp: true,
      show_target_temp: true,
      show_temp_control: true,
      show_liquid_level: true,
      show_battery: true,
      show_led: true,
      show_state: true,
      show_title: true,
      show_presets: true,
      show_visual: true
    };
  }

  /**
   * Render the card
   */
  render() {
    // Render loading state if data isn't available
    if (!this.hass) {
      return html`
        <ha-card>
          <div class="card-container">
            <div style="text-align: center; padding: 1em;">
              Loading Home Assistant data...
            </div>
          </div>
        </ha-card>
      `;
    }
    
    // Render error state if configuration is missing
    if (!this.config || !this.config.entity) {
      return html`
        <ha-card>
          <div class="card-container">
            <div style="text-align: center; padding: 1em; color: var(--error-color);">
              <ha-icon icon="mdi:alert-circle"></ha-icon>
              Invalid configuration: No entity specified
            </div>
          </div>
        </ha-card>
      `;
    }
    
    // Render error if entities aren't initialized properly
    if (!this._entitiesInitialized) {
      return html`
        <ha-card>
          <div class="card-container">
            <div style="text-align: center; padding: 1em;">
              <ha-circular-progress active></ha-circular-progress>
              <div style="margin-top: 1em;">Connecting to Ember Mug...</div>
            </div>
          </div>
        </ha-card>
      `;
    }
    
    // Get title from config or state
    const title = this.config.title || this._mugState.mugName;
    
    // Main card rendering
    return html`
      <ha-card>
        <div class="card-container">
          <!-- Card Header -->
          <div class="card-header" role="heading" aria-level="3">
            ${this.config.show_title ? html`<div class="title">${title}</div>` : ''}
            
            ${this.config.show_state ? html`
              <span class="state-badge" 
                style="background-color: ${this._mugState.getStateColor()}"
                role="status" 
                aria-label="Mug state: ${this._mugState.state.replace('_', ' ')}">
                <ha-icon icon="${this._mugState.getStateIcon()}"></ha-icon>
                ${this.config.layout !== 'minimal' ? this._mugState.state.replace('_', ' ') : ''}
              </span>
            ` : ''}
            
            ${this.config.show_battery ? html`
              <div class="battery" role="status" aria-label="Battery level ${Math.round(this._mugState.batteryLevel)}${this._mugState.isCharging ? ', charging' : ''}">
                <ha-icon icon="${this._mugState.getBatteryIcon()}"></ha-icon>
                ${Math.round(this._mugState.batteryLevel)}%
                ${this._mugState.isCharging ? html`<ha-icon icon="mdi:power-plug"></ha-icon>` : ''}
              </div>
            ` : ''}
          </div>
          
          <!-- Card Content -->
          <div class="card-content">
            ${this.config.show_visual ? html`
              <ember-mug-visualization
                .state=${this._mugState}
                .scale=${this.config.mug_scale || 1.0}
              ></ember-mug-visualization>
            ` : ''}
            
            <ember-mug-controls
              .hass=${this.hass}
              .config=${this.config}
              .state=${this._mugState}
              .entities=${this._entities}
              .layout=${this.config.layout}
              .visualPresent=${this.config.show_visual}
              @target-temp-change=${this._handleTargetTempChange}
              @temp-control-toggle=${this._handleTempControlToggle}
              @led-color-change=${this._handleLedColorChange}
              @preset-select=${this._handlePresetSelect}
              @temp-slider-move=${this._handleTempSliderMove}
            ></ember-mug-controls>
          </div>
        </div>
      </ha-card>
    `;
  }

  /**
   * Component styles
   */
  static get styles() {
    return css`
      :host {
        display: block;
      }
      
      ha-card {
        height: 100%;
        overflow: visible;
      }
      
      /* Card container */
      .card-container {
        padding: 16px;
        width: 100%;
        box-sizing: border-box;
        height: auto;
        overflow: hidden;
        color: var(--primary-text-color);
      }
      
      /* Card header */
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding: 0 4px;
        gap: 8px;
      }
      
      /* Card title */
      .card-header .title {
        font-size: 1.4rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      
      /* State badge */
      .state-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 12px;
        color: white;
        font-size: 0.9rem;
        text-transform: capitalize;
        white-space: nowrap;
      }
      
      .state-badge ha-icon {
        --mdc-icon-size: 18px;
        color: white !important;
        margin-right: 4px;
      }
      
      /* Battery display */
      .battery {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.9rem;
        white-space: nowrap;
      }
      
      /* Card content */
      .card-content {
        display: flex;
        flex-direction: row;
        gap: min(36px, 15%);
        width: 100%;
        transition: flex-direction 0.3s ease;
        overflow: visible;
      }
      
      /* Responsive layout adjustments */
      :host([layout="compact"]) .card-content {
        flex-direction: column;
        align-items: center;
      }
      
      /* Compact layout adjustments */
      :host([layout="compact"]) .card-header .title {
        font-size: 1.2rem;
      }
      
      /* Minimal layout adjustments */
      :host([layout="minimal"]) .card-container {
        padding: 8px;
      }
      
      :host([layout="minimal"]) .card-header {
        margin-bottom: 8px;
      }
      
      :host([layout="minimal"]) .card-header .title {
        font-size: 1.1rem;
      }
      
      :host([layout="minimal"]) .state-badge {
        padding: 0px 6px;
        font-size: 0.8rem;
      }
      
      :host([layout="minimal"]) .state-badge ha-icon {
        --mdc-icon-size: 14px;
        margin-right: 2px;
      }
      
      :host([layout="minimal"]) .battery {
        font-size: 0.8rem;
        gap: 2px;
      }
      
      :host([layout="minimal"]) .card-content {
        gap: 4px;
      }
    `;
  }
}

customElements.define("ember-mug-card", EmberMugCard);
