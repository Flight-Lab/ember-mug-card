// Get HA's LitElement instead of importing from CDN
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const { html, css } = LitElement.prototype;

/**
 * Ember Mug Controls Component
 * 
 * Handles all control inputs for the Ember Mug card
 * 
 * @customElement ember-mug-controls
 * @litElement
 */
export class EmberMugControls extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      state: { type: Object },
      entities: { type: Object },
      layout: { type: String },
      visualPresent: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.hass = {};
    this.config = {};
    this.state = {};
    this.entities = {};
    this.layout = 'default';
    this.visualPresent = false;

    // Control interaction states
    this._colorPickerActive = false;
    this._dropdownActive = false;
  }

  /**
   * Called when the element is added to the DOM
   */
  connectedCallback() {
    super.connectedCallback();

    // Set layout attribute for CSS
    if (this.layout) {
      this.setAttribute('layout', this.layout);
    }

    // Set visual-present attribute for CSS
    if (this.visualPresent) {
      this.setAttribute('visual-present', '');
    } else {
      this.removeAttribute('visual-present');
    }
  }

  /**
   * Called when element is disconnected from DOM
   */
  disconnectedCallback() {
    super.disconnectedCallback();
  }

  /**
   * Called when properties change
   */
  updated(changedProps) {
    // Update layout attribute when layout changes
    if (changedProps.has('layout') && this.layout) {
      this.setAttribute('layout', this.layout);
    }

    // Update visual-present attribute when visualPresent changes
    if (changedProps.has('visualPresent')) {
      if (this.visualPresent) {
        this.setAttribute('visual-present', '');
      } else {
        this.removeAttribute('visual-present');
      }
    }
  }

  /**
   * Handle temperature control toggle
   * @private
   */
  _handleTempControlToggle() {
    this.dispatchEvent(new CustomEvent('temp-control-toggle'));
  }

  /**
   * Update local slider value during dragging (without sending to HA)
   * @private
   * @param {Event} e - Input event
   */
  _updateLocalTempValue(e) {
    // Get temperature value from slider
    const value = parseFloat(e.target.value);

    // Update all temperature display elements

    // Update target-temp-value element (used in minimal layout)
    const minimalTempEl = this.shadowRoot.querySelector('.target-temp-value');
    if (minimalTempEl) {
      minimalTempEl.textContent = `${Math.round(value)}°${this._getTemperatureUnit()}`;
    }

    // Update value-text element (used in default layout)
    const defaultTempEl = this.shadowRoot.querySelector('.value-text');
    if (defaultTempEl) {
      defaultTempEl.textContent = `${Math.round(value)}°${this._getTemperatureUnit()}`;
    }

    // Temporarily update the state model for visualization consistency
    if (this.state && typeof this.state.setPendingTargetTemp === 'function') {
      this.state.setPendingTargetTemp(value);
    }

    // Dispatch a custom event to notify parent components about the live update
    this.dispatchEvent(new CustomEvent('temp-slider-move', {
      detail: { value },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle target temperature change when slider is released
   * @private
   * @param {Event} e - Change event
   */
  _handleTargetTempChange(e) {
    const value = parseFloat(e.target.value);
    this.dispatchEvent(new CustomEvent('target-temp-change', {
      detail: { value }
    }));
  }

  /**
   * Handle color picker focus to track interaction state
   * @private
   */
  _handleColorPickerFocus() {
    this._colorPickerActive = true;
  }

  /**
   * Handle LED color change
   * @private
   * @param {Event} e - Color picker change event
   */
  _handleLedColorChange(e) {
    // Stop event propagation to prevent issues
    e.stopPropagation();

    // Reset active state
    this._colorPickerActive = false;

    // Dispatch event with color value
    const value = e.target.value;
    this.dispatchEvent(new CustomEvent('led-color-change', {
      detail: { value }
    }));
  }

  /**
   * Handle dropdown open event
   * @private
   * @param {Event} e - Click event
   */
  _handleDropdownOpen(e) {
    // Prevent event propagation
    e.stopPropagation();

    // Mark dropdown as active
    this._dropdownActive = true;

    // Force dropdown to render correctly with proper positioning
    setTimeout(() => {
      const haSelect = e.currentTarget;
      const menu = this.shadowRoot.querySelector('mwc-menu');

      if (menu) {
        // Ensure dropdown displays properly
        menu.style.position = 'fixed';
        menu.style.zIndex = '999';
        menu.anchor = haSelect;
        menu.corner = 'BOTTOM_START';
      }
    }, 50);
  }

  /**
   * Handle dropdown closed event
   * @private
   * @param {Event} e - Close event
   */
  _handleDropdownClosed(e) {
    // Reset active state after a delay
    setTimeout(() => {
      this._dropdownActive = false;
    }, 100);
  }

  /**
   * Handle temperature preset selection
   * @private
   * @param {Event} e - Select event
   */
  _handlePresetSelect(e) {
    const value = e.target.value;

    // Validate selection before dispatching
    if (value === "" || value === "none") return;

    // Validate against available options
    if (!this.state.presetOptions?.includes(value)) {
      console.warn(`Selected preset "${value}" is not in available options:`, this.state.presetOptions);
      return;
    }

    this.dispatchEvent(new CustomEvent('preset-select', {
      detail: { value }
    }));
  }

  /**
   * Get temperature unit display
   * @private
   * @returns {string} Temperature unit (°C or °F)
   */
  _getTemperatureUnit() {
    return this.state.temperatureUnit || 'C';
  }

  /**
   * Render controls in minimal layout
   * @private
   * @returns {TemplateResult}
   */
  _renderMinimalControls() {
    const { config, state, entities } = this;
    const tempUnit = this._getTemperatureUnit();

    return html`
      <div class="control-row">
        ${config.show_current_temp ? html`
          <ha-icon icon="mdi:thermometer" aria-hidden="true"></ha-icon>
          <span aria-label="Current temperature ${Math.round(state.temperature)}°${tempUnit}">${Math.round(state.temperature)}°${tempUnit}</span>
        ` : ''}
        
        ${config.show_liquid_level ? html`
          <ha-icon icon="${state.getLiquidLevelIcon()}" aria-hidden="true"></ha-icon>
          <span aria-label="Liquid level ${Math.round(state.liquidLevel)}%">${Math.round(state.liquidLevel)}%</span>
        ` : ''}
        
        ${entities.led && config.show_led ? html`
          <ha-icon icon="mdi:led-variant-on" aria-hidden="true"></ha-icon>
          <input 
            type="color" 
            class="color-picker" 
            .value="${state.displayLedColor}"
            aria-label="LED Color"
            @change="${this._handleLedColorChange}"
            @focus="${this._handleColorPickerFocus}"
            @click="${e => e.stopPropagation()}"
          >
        ` : ''}
        
        ${entities.tempControl && config.show_temp_control ? html`
          <ha-icon icon="mdi:thermometer-lines" aria-hidden="true"></ha-icon>
          <div 
            class="temp-control-switch" 
            role="switch"
            aria-checked="${state.temperatureControl}"
            aria-label="Temperature control ${state.temperatureControl ? 'on' : 'off'}"
            tabindex="0"
            ?checked="${state.temperatureControl}"
            @click="${this._handleTempControlToggle}"
            @keydown="${e => e.key === 'Enter' && this._handleTempControlToggle()}">
          </div>
        ` : ''}
      </div>
      
      ${entities.targetTemp && state.temperatureControl && config.show_target_temp ? html`
        <div class="control-row">
          <ha-slider
            min="${state.minTemp}"
            max="${state.maxTemp}"
            step="0.5"
            .value="${state.displayTargetTemp}"
            aria-label="Target temperature ${Math.round(state.displayTargetTemp)}°${tempUnit}"
            @input="${this._updateLocalTempValue}"
            @change="${this._handleTargetTempChange}">
          </ha-slider>
          <span class="target-temp-value">${Math.round(state.displayTargetTemp)}°${tempUnit}</span>
        </div>
      ` : ''}
    `;
  }

  /**
   * Render controls in default layout
   * @private
   * @returns {TemplateResult}
   */
  _renderDefaultControls() {
    const { config, state, entities } = this;
    const tempUnit = this._getTemperatureUnit();

    return html`
      ${config.show_current_temp ? html`
        <div class="control-row">
          <ha-icon icon="mdi:thermometer" aria-hidden="true"></ha-icon>
          <span class="label">Current Temperature</span>
          <span aria-label="Current temperature ${Math.round(state.temperature)}°${tempUnit}">${Math.round(state.temperature)}°${tempUnit}</span>
        </div>
      ` : ''}
        
      ${entities.tempControl && config.show_temp_control ? html`
        <div class="control-row">
          <ha-icon icon="mdi:thermometer-lines" aria-hidden="true"></ha-icon>
          <span class="label">Temperature Control</span>
          <div 
            class="temp-control-switch" 
            role="switch"
            aria-checked="${state.temperatureControl}"
            aria-label="Temperature control ${state.temperatureControl ? 'on' : 'off'}"
            tabindex="0"
            ?checked="${state.temperatureControl}"
            @click="${this._handleTempControlToggle}"
            @keydown="${e => e.key === 'Enter' && this._handleTempControlToggle()}">
          </div>
        </div>
      ` : ''}
        
      ${entities.targetTemp && state.temperatureControl && config.show_target_temp ? html`
        <div class="control-row">
          <ha-icon icon="mdi:target" aria-hidden="true"></ha-icon>
          <span class="label">Target Temperature</span>
          <span class="value-text">${Math.round(state.displayTargetTemp)}°${tempUnit}</span>
        </div>
        <div class="control-row">
          <ha-slider
            min="${state.minTemp}"
            max="${state.maxTemp}"
            step="0.5"
            .value="${state.displayTargetTemp}"
            aria-label="Target temperature slider"
            @input="${this._updateLocalTempValue}"
            @change="${this._handleTargetTempChange}">
          </ha-slider>
        </div>
      ` : ''}
      
      ${config.show_presets && entities.tempPreset && state.temperatureControl && state.presetOptions?.length > 0 ? html`
        <div class="control-row two-line">
          <ha-icon icon="mdi:playlist-edit" aria-hidden="true"></ha-icon>
          <span class="label two-line">
            Temperature
            <br>Preset
          </span>
          <ha-select
            .value="${state.temperaturePreset}"
            fixedMenuPosition
            naturalMenuWidth
            aria-label="Temperature preset"
            @click="${this._handleDropdownOpen}"
            @closed="${this._handleDropdownClosed}"
            @selected="${this._handlePresetSelect}"
          >
            <mwc-list-item value="none" selected disabled style="display:none;"></mwc-list-item>
            ${state.presetOptions.map(option => html`
              <mwc-list-item .value="${option}">
                ${option.replace('-', ' ')}
              </mwc-list-item>
            `)}
          </ha-select>
        </div>
      ` : ''}
      
      ${config.show_liquid_level ? html`
        <div class="control-row">
          <ha-icon icon="${state.getLiquidLevelIcon()}" aria-hidden="true"></ha-icon>
          <span class="label">Liquid Level</span>
          <span aria-label="Liquid level ${Math.round(state.liquidLevel)}%">${Math.round(state.liquidLevel)}%</span>
        </div>
        <div class="progress-bar" 
             role="progressbar" 
             aria-valuenow="${Math.round(state.liquidLevel)}" 
             aria-valuemin="0" 
             aria-valuemax="100">
          <div class="progress-value" style="width: ${state.liquidLevel}%"></div>
        </div>
      ` : ''}
      
      ${config.show_led && entities.led ? html`
        <div class="control-row">
          <ha-icon icon="mdi:led-variant-on" aria-hidden="true"></ha-icon>
          <span class="label">LED Color</span>
          <input 
            type="color" 
            class="color-picker" 
            .value="${state.displayLedColor}"
            aria-label="LED Color"
            @change="${this._handleLedColorChange}"
            @focus="${this._handleColorPickerFocus}"
            @click="${e => e.stopPropagation()}"
          >
        </div>
      ` : ''}
    `;
  }

  /**
   * Styles for the controls component
   */
  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
        overflow: hidden;
        flex: 1;
        min-width: 0;
      }
      
      .controls-container {
        display: flex;
        flex-direction: column;
        gap: var(--ember-controls-gap, 8px);
        width: 100%;
        min-width: 0;
      }
      
      .control-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 24px;
        width: 100%;
        min-width: 0; /* Allow shrinking */
      }
      
      /* Control row with two lines of text */
      .control-row.two-line {
        min-height: 40px;
      }
      
      .control-row ha-icon {
        color: var(--secondary-text-color);
        flex-shrink: 0;
        --mdc-icon-size: 20px;
      }
      
      .control-row .label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.9rem;
        min-width: 0;
      }
      
      /* Two-line label styles */
      .control-row .label.two-line {
        white-space: normal;
        line-height: 1.2;
      }

      /* Control ha-select width */
      ha-select {
        flex-shrink: 0;
        width: 100px;
        --mdc-typography-subtitle1-font-size: 0.9rem;
        --mdc-menu-min-width: 100px;
      }

      /* Layout-specific adjustments */
      :host([layout="compact"]) ha-select {
        width: 85px;
        --mdc-typography-subtitle1-font-size: 0.85rem;
        --mdc-menu-min-width: 85px;
      }

      :host([layout="minimal"]) ha-select {
        width: 75px;
        --mdc-typography-subtitle1-font-size: 0.8rem;
        --mdc-menu-min-width: 75px;
      }
      
      /* Value display */
      .value-text, .target-temp-value {
        font-weight: bold;
        min-width: 34px;
        width: auto;
        text-align: right;
        flex-shrink: 0;
      }
      
      /* Switch control */
      .temp-control-switch {
        position: relative;
        display: inline-block;
        width: 36px;
        height: 20px;
        background-color: var(--switch-unchecked-color, #ccc);
        border-radius: 20px;
        cursor: pointer;
        flex-shrink: 0;
        transition: background-color 0.3s;
      }
      
      .temp-control-switch[checked] {
        background-color: var(--primary-color);
      }
      
      .temp-control-switch::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: white;
        top: 2px;
        left: 2px;
        transition: left 0.3s ease;
      }
      
      .temp-control-switch[checked]::after {
        left: 18px;
      }
      
      /* Focus styles for switch */
      .temp-control-switch:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      
      /* Progress bar for liquid level */
      .progress-bar {
        flex: 1;
        background-color: var(--divider-color);
        border-radius: 4px;
        height: 8px;
        overflow: hidden;
        margin-top: 2px;
        width: 100%;
      }
      
      .progress-value {
        background-color: var(--primary-color);
        height: 100%;
        transition: width 1s ease;
      }
      
      /* Color picker styles */
      .color-picker {
        padding: 0;
        margin: 0;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        overflow: hidden;
        cursor: pointer;
      }
      
      /* Focus style for color picker */
      .color-picker:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      
      /* Divider */
      .divider {
        height: 1px;
        background-color: var(--divider-color);
        margin: 6px 0;
        width: 100%;
      }
      
      /* Compact layout adjustments */
      :host([layout="compact"]) .control-row {
        min-height: 20px;
        gap: 4px;
      }
      
      :host([layout="compact"]) .control-row .label {
        font-size: 0.85rem;
      }
      
      :host([layout="compact"]) .control-row ha-icon {
        --mdc-icon-size: 16px;
      }
      
      :host([layout="compact"]) .value-text, 
      :host([layout="compact"]) .target-temp-value {
        width: 42px;
        font-size: 0.9rem;
      }
      
      /* Minimal layout adjustments */
      :host([layout="minimal"]) .control-row {
        min-height: 20px;
        gap: 4px;
      }
      
      :host([layout="minimal"]) .control-row .label {
        font-size: 0.8rem;
      }
      
      :host([layout="minimal"]) .control-row ha-icon {
        --mdc-icon-size: 16px;
      }
      
      :host([layout="minimal"]) .value-text,
      :host([layout="minimal"]) .target-temp-value {
        width: 40px;
        font-size: 0.9rem;
      }
      
      :host([layout="minimal"]) .temp-control-switch {
        width: 32px;
        height: 18px;
      }
      
      :host([layout="minimal"]) .temp-control-switch::after {
        width: 14px;
        height: 14px;
        top: 2px;
        left: 2px;
      }
      
      :host([layout="minimal"]) .temp-control-switch[checked]::after {
        left: 16px;
      }
      
      :host([layout="minimal"]) .progress-bar {
        height: 6px;
      }
      
      /* Right-justify controls in minimal layout when visualization is present */
      :host([layout="minimal"][visual-present]) .control-row {
        justify-content: flex-end;
        gap: 6px;
      }
      
      /* Ensure target temperature slider stays aligned */
      :host([layout="minimal"][visual-present]) .control-row ha-slider {
        flex: 1;
        max-width: calc(100% - 45px);
      }
      
      /* Adjust sliders */
      ha-slider {
        width: 100%;
        --paper-slider-active-color: var(--primary-color);
        --paper-slider-knob-color: var(--primary-color);
        --paper-slider-pin-color: var(--primary-color);
        --paper-slider-container-color: var(--divider-color);
        --paper-slider-secondary-color: var(--primary-color);
        --paper-slider-font-color: white;
      }
      
      /* Fix dropdown positioning */
      mwc-menu {
        position: fixed !important;
        z-index: 999 !important;
      }
    `;
  }

  /**
   * Render the controls
   */
  render() {
    // Safety check for required props
    if (!this.state || !this.config) {
      return html`<div>Loading controls...</div>`;
    }

    return html`
      <div class="controls-container" aria-label="Ember mug controls">
        ${this.layout === 'minimal'
        ? this._renderMinimalControls()
        : this._renderDefaultControls()}
      </div>
    `;
  }
}

customElements.define("ember-mug-controls", EmberMugControls);
