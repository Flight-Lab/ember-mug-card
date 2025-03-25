// Get HA's LitElement instead of importing from CDN
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const { html, css } = LitElement.prototype;

/**
 * Ember Mug Card Editor - Configuration UI for the Ember Mug Card
 * 
 * @customElement ember-mug-card-editor
 * @litElement
 */
export class EmberMugCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object }
    };
  }

  constructor() {
    super();
    this._config = {};
  }

  /**
   * Sets configuration when the editor is loaded
   * @param {Object} config - Card configuration
   */
  setConfig(config) {
    this._config = { ...config };
  }

  /**
   * Apply default values to ensure all required properties exist
   * @private
   * @returns {Object} Standardized configuration
   */
  _standardizeConfig() {
    const defaultConfig = {
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
      mug_scale: 1.0
    };
    
    return { ...defaultConfig, ...this._config };
  }

  /**
   * Handle value changes from editor controls
   * @private
   * @param {Event} ev - Change event from control
   */
  _valueChanged(ev) {
    if (!this._config) return;
    
    // Get standardized config
    const config = this._standardizeConfig();
    
    // Determine the changed property and value
    const target = ev.target;
    let newConfig;
    
    if (ev.detail && ev.detail.hasOwnProperty('value')) {
      // Handle ha-entity-picker and similar
      const key = target.configValue;
      const value = ev.detail.value;
      
      if (key) {
        newConfig = { ...config, [key]: value };
      }
    } else if (target.configValue) {
      // Handle standard elements with configValue
      const key = target.configValue;
      let value;
      
      // Special handling for ha-switch components
      if (target.tagName.toLowerCase() === 'ha-switch') {
        value = target.checked;
      } else if (target.type === 'checkbox') {
        value = target.checked;
      } else if (target.type === 'number') {
        value = Number(target.value);
      } else {
        value = target.value;
      }
      
      newConfig = { ...config, [key]: value };
    }
    
    if (newConfig) {
      this._config = newConfig;
      this._fireConfigChangedEvent();
    }
  }

  /**
   * Handle input event for mug scale slider for live preview
   * @private
   * @param {Event} ev - Input event
   */
  _handleMugScaleInput(ev) {
    if (!this._config) return;
    
    // Get the current scale value
    const scale = parseFloat(ev.target.value);
    
    // Update the displayed value
    const valueDisplay = this.shadowRoot.querySelector('.mug-scale-value');
    if (valueDisplay) {
      valueDisplay.textContent = `${scale.toFixed(1)}x`;
    }
    
    // Dispatch a preview event for the main card
    this._fireScalePreviewEvent(scale);
  }

  /**
   * Fire scale preview event to update visualization
   * @private
   * @param {number} scale - Scale value for preview
   */
  _fireScalePreviewEvent(scale) {
    const event = new CustomEvent("scale-preview", {
      detail: { scale },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
  }

  /**
   * Dispatch event to notify card of changes
   * @private
   */
  _fireConfigChangedEvent() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
  }

  /**
   * CSS styles for the editor
   */
  static get styles() {
    return css`
      .option {
        padding: 12px 0;
        display: flex;
        flex-direction: column;
      }
      
      .option-group {
        border-top: 1px solid var(--divider-color);
        margin-top: 16px;
        padding-top: 16px;
      }
      
      .option-group-header {
        color: var(--primary-text-color);
        font-weight: 500;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
      }
      
      .option-group-header ha-icon {
        margin-right: 8px;
        color: var(--secondary-text-color);
      }
      
      ha-switch {
        margin-right: 10px;
      }
      
      .row {
        display: flex;
        align-items: center;
        padding: 8px 0;
      }
      
      .row .flex {
        flex: 1;
      }
      
      .row ha-icon {
        color: var(--secondary-text-color);
        margin-right: 10px;
      }
      
      .slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
      }
      
      .slider-row .slider {
        flex: 1;
      }
      
      .slider-row .value {
        min-width: 40px;
        text-align: right;
      }
      
      .description {
        color: var(--secondary-text-color);
        font-size: 0.9em;
        margin-top: 4px;
      }
      
      /* Help text tooltip */
      .tooltip-container {
        position: relative;
        display: inline-block;
        margin-left: 8px;
      }
      
      .tooltip-icon {
        color: var(--secondary-text-color);
        cursor: help;
      }
      
      .tooltip-text {
        visibility: hidden;
        width: 250px;
        background-color: var(--primary-background-color);
        color: var(--primary-text-color);
        text-align: left;
        border-radius: 6px;
        padding: 8px;
        position: absolute;
        z-index: 1;
        top: -5px;
        left: 125%;
        opacity: 0;
        transition: opacity 0.3s;
        box-shadow: var(--ha-card-box-shadow);
        font-weight: normal;
        font-size: 0.9em;
        border: 1px solid var(--divider-color);
      }
      
      .tooltip-container:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
      }
    `;
  }

  /**
   * Render tooltip helper
   * @private
   * @param {string} text - Tooltip text
   * @returns {TemplateResult}
   */
  _renderTooltip(text) {
    return html`
      <div class="tooltip-container">
        <ha-icon class="tooltip-icon" icon="mdi:help-circle-outline"></ha-icon>
        <span class="tooltip-text">${text}</span>
      </div>
    `;
  }

  /**
   * Main render method for the editor
   */
  render() {
    if (!this.hass || !this._config) {
      return html`<div>Loading editor...</div>`;
    }

    // Apply standardized config
    const config = this._standardizeConfig();

    // Get entity options for the entity picker
    const entityOptions = Object.keys(this.hass.states)
      .filter(entId => entId.startsWith('sensor.ember_'))
      .sort();

    return html`
      <div class="card-config">
        <div class="option">
          <ha-entity-picker
            .label=${"Ember Mug Entity"}
            .hass=${this.hass}
            .value=${config.entity}
            .configValue=${"entity"}
            .includeDomains=${["sensor"]}
            @value-changed=${this._valueChanged}
            allow-custom-entity
          ></ha-entity-picker>
          <div class="description">
            Select the main Ember Mug state sensor entity
          </div>
        </div>
        
        <div class="option">
          <ha-textfield
            .label=${"Card Title"}
            .value=${config.title || ""}
            .configValue=${"title"}
            @input=${this._valueChanged}
          ></ha-textfield>
          <div class="description">
            Custom title for the card (defaults to mug name if left empty)
          </div>
        </div>

        <div class="option-group">
          <div class="option-group-header">
            <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
            Layout Options
            ${this._renderTooltip("Configure how the card will be displayed in your dashboard")}
          </div>
          
          <div class="option">
            <ha-select
              .label=${"Layout Style"}
              .value=${config.layout}
              .configValue=${"layout"}
              @selected=${this._valueChanged}
              @closed=${(ev) => ev.stopPropagation()}
            >
              <mwc-list-item value="default">Default</mwc-list-item>
              <mwc-list-item value="compact">Compact</mwc-list-item>
              <mwc-list-item value="minimal">Minimal</mwc-list-item>
            </ha-select>
            <div class="description">
              Select layout style for the card
            </div>
          </div>
          
          <div class="slider-row">
            <ha-icon icon="mdi:scale"></ha-icon>
            <div class="flex">Mug Scale</div>
            <div class="slider">
              <ha-slider
                min="0.5"
                max="2"
                step="0.1"
                pin
                .value=${config.mug_scale}
                .configValue=${"mug_scale"}
                @input=${this._handleMugScaleInput}
                @change=${this._valueChanged}
              ></ha-slider>
            </div>
            <div class="value mug-scale-value">${config.mug_scale}x</div>
          </div>
        </div>

        <div class="option-group">
          <div class="option-group-header">
            <ha-icon icon="mdi:card-outline"></ha-icon>
            Card Elements
            ${this._renderTooltip("Configure which elements to show on the card")}
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:cup"></ha-icon>
            <div class="flex">Show Mug Visualization</div>
            <ha-switch
              .checked=${config.show_visual}
              .configValue=${"show_visual"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            <div class="flex">Show Mug State</div>
            <ha-switch
              .checked=${config.show_state}
              .configValue=${"show_state"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:battery"></ha-icon>
            <div class="flex">Show Battery Status</div>
            <ha-switch
              .checked=${config.show_battery}
              .configValue=${"show_battery"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:format-title"></ha-icon>
            <div class="flex">Show Card Title</div>
            <ha-switch
              .checked=${config.show_title}
              .configValue=${"show_title"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
        </div>
        
        <div class="option-group">
          <div class="option-group-header">
            <ha-icon icon="mdi:thermometer"></ha-icon>
            Temperature Controls
            ${this._renderTooltip("Configure temperature-related elements on the card")}
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:thermometer"></ha-icon>
            <div class="flex">Show Current Temperature</div>
            <ha-switch
              .checked=${config.show_current_temp}
              .configValue=${"show_current_temp"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:thermometer-lines"></ha-icon>
            <div class="flex">Show Temperature Control Switch</div>
            <ha-switch
              .checked=${config.show_temp_control}
              .configValue=${"show_temp_control"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:target"></ha-icon>
            <div class="flex">Show Target Temperature</div>
            <ha-switch
              .checked=${config.show_target_temp}
              .configValue=${"show_target_temp"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:playlist-edit"></ha-icon>
            <div class="flex">Show Temperature Presets</div>
            <ha-switch
              .checked=${config.show_presets}
              .configValue=${"show_presets"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
        </div>

        <div class="option-group">
          <div class="option-group-header">
            <ha-icon icon="mdi:tune"></ha-icon>
            Additional Controls
            ${this._renderTooltip("Configure other mug controls to display")}
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:cup-water"></ha-icon>
            <div class="flex">Show Liquid Level</div>
            <ha-switch
              .checked=${config.show_liquid_level}
              .configValue=${"show_liquid_level"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:led-on"></ha-icon>
            <div class="flex">Show LED Color Control</div>
            <ha-switch
              .checked=${config.show_led}
              .configValue=${"show_led"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("ember-mug-card-editor", EmberMugCardEditor);
