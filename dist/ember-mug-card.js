class e{constructor(){this.temperature=0,this.targetTemperature=0,this.batteryLevel=0,this.liquidLevel=0,this.state="unknown",this.ledColor="#ffffff",this.ledColorHex="#ffffff",this.temperatureControl=!1,this.temperaturePreset="",this.isCharging=!1,this.mugName="Ember Mug",this.temperatureUnit="C",this.minTemp=50,this.maxTemp=65,this.presetOptions=[],this.pendingTargetTemp=null,this.pendingLedColor=null}update(e){e&&"object"==typeof e&&(this._updatePendingProperties(e),this._updateRegularProperties(e),this._updateCalculatedProperties(e))}_updatePendingProperties(e){"targetTemperature"in e&&(null===this.pendingTargetTemp||Math.abs(this.pendingTargetTemp-e.targetTemperature)<.1)&&(this.targetTemperature=e.targetTemperature,this.pendingTargetTemp=null),null===this.pendingLedColor&&("ledColorHex"in e&&(this.ledColorHex=e.ledColorHex),"ledColor"in e&&(this.ledColor=e.ledColor))}_updateRegularProperties(e){const t=["targetTemperature","ledColor","ledColorHex","presetOptions","minTemp","maxTemp"];Object.entries(e).forEach((([e,i])=>{t.includes(e)||void 0===i||(this[e]=i)}))}_updateCalculatedProperties(e){Array.isArray(e.presetOptions)&&(this.presetOptions=[...e.presetOptions]),"number"==typeof e.minTemp&&(this.minTemp=e.minTemp),"number"==typeof e.maxTemp&&(this.maxTemp=e.maxTemp),e.temperatureUnit&&["C","F"].includes(e.temperatureUnit)&&(this.temperatureUnit=e.temperatureUnit)}setPendingTargetTemp(e){this.pendingTargetTemp=e,this.targetTemperature=e}setPendingLedColor(e){this.pendingLedColor=e,this.ledColorHex=e}get displayTargetTemp(){return null!==this.pendingTargetTemp?this.pendingTargetTemp:this.targetTemperature}get displayLedColor(){return this.pendingLedColor||this.ledColorHex}getTemperatureUnitSymbol(){return`°${this.temperatureUnit}`}getStateIcon(){switch(this.state){case"heating":return"mdi:thermometer-chevron-up";case"cooling":return"mdi:thermometer-chevron-down";case"perfect":return"mdi:check-circle-outline";case"empty":return"mdi:coffee-off-outline";case"filling":return"mdi:coffee";case"standby":return"mdi:power-sleep";case"cold_no_control":return"mdi:snowflake";case"warm_no_control":return"mdi:heat-wave";default:return"mdi:help-circle-outline"}}getStateColor(){switch(this.state){case"heating":return"#ff5722";case"cooling":case"filling":return"#2196f3";case"perfect":return"#4caf50";case"empty":case"standby":default:return"#9e9e9e";case"cold_no_control":return"#81d4fa";case"warm_no_control":return"#ffb74d"}}getBatteryIcon(){return this.isCharging?"mdi:battery-charging":this.batteryLevel>90?"mdi:battery":this.batteryLevel>70?"mdi:battery-80":this.batteryLevel>50?"mdi:battery-60":this.batteryLevel>30?"mdi:battery-40":this.batteryLevel>10?"mdi:battery-20":"mdi:battery-outline"}getLiquidLevelIcon(){return this.liquidLevel>10?"mdi:coffee":this.liquidLevel>0?"mdi:coffee-outline":"mdi:coffee-off-outline"}}const t=Object.getPrototypeOf(customElements.get("ha-panel-lovelace")),{html:i,css:s}=t.prototype;customElements.define("ember-mug-card",class extends t{static get properties(){return{hass:{type:Object},config:{type:Object}}}constructor(){super(),this.config={},this._mugState=new e,this._entities={},this._entitiesInitialized=!1,this._entityCache={},this._previousBaseEntity=null,this._resizeFrame=null,this._isResizing=!1,this._resizeObserver=new ResizeObserver((()=>this._handleResize())),this._cardId=Math.random().toString(36).substring(2,15)}connectedCallback(){super.connectedCallback(),this.addEventListener("scale-preview",this._handleScalePreview.bind(this)),setTimeout((()=>{const e=this.shadowRoot.querySelector(".card-container");e&&this._resizeObserver.observe(e)}),10)}disconnectedCallback(){this.removeEventListener("scale-preview",this._handleScalePreview.bind(this)),this._resizeObserver.disconnect(),this._resizeFrame&&(cancelAnimationFrame(this._resizeFrame),this._resizeFrame=null),super.disconnectedCallback()}setConfig(e){if(!e)throw new Error("Invalid configuration");if(!e.entity)throw new Error("You need to define an entity");this.config={show_current_temp:!0,show_target_temp:!0,show_temp_control:!0,show_liquid_level:!0,show_battery:!0,show_led:!0,show_state:!0,show_title:!0,show_presets:!0,show_visual:!0,layout:"default",mug_scale:1,...e},this.config.layout&&this.setAttribute("layout",this.config.layout)}updated(e){if(e.has("config")&&this.config?.layout&&this.setAttribute("layout",this.config.layout),e.has("hass")&&this.hass&&this.config){const e=this.config.entity,t=this._previousBaseEntity!==e;!this._entitiesInitialized||t?this._initializeEntities():this._processStateChanges()}}_getDeviceIdFromEntity(e){if(!this.hass||!e)return null;try{const t=(this.hass.entities||{})[e];if(t&&t.device_id)return t.device_id;const i=this.hass.states[e];if(i&&i.attributes&&i.attributes.device_id)return i.attributes.device_id}catch(t){console.warn(`Ember Mug Card: Error getting device_id for entity "${e}":`,t)}return null}_findDeviceEntities(e){if(!this.hass||!e)return[];const t=[];try{if(this.hass.entities)for(const[i,s]of Object.entries(this.hass.entities))s.device_id===e&&t.push(i);if(0===t.length)for(const[i,s]of Object.entries(this.hass.states))s.attributes&&s.attributes.device_id===e&&t.push(i)}catch(e){console.error("Ember Mug Card: Error finding device entities:",e)}return t}_initializeEntities(){const e=this.config.entity;if(!this.hass.states[e])return void console.warn(`Ember Mug Card: Base entity "${e}" not found`);const t=this._getDeviceIdFromEntity(e);t?(console.info(`Ember Mug Card: Found device_id ${t} for "${e}"`),this._initializeEntitiesFromDevice(t)):(console.info(`Ember Mug Card: No device relationship found for "${e}", using string-based method`),this._initializeEntitiesFromString(e)),this._entityCache={},this._previousBaseEntity=e,this._entitiesInitialized=!0,this._cacheCurrentEntityStates(),this._updateState()}_initializeEntitiesFromDevice(e){this._entities={};try{const t=this._findDeviceEntities(e);if(0===t.length)return console.warn(`Ember Mug Card: No entities found for device ${e}`),void this._initializeEntitiesFromString(this.config.entity);const i={};if(t.forEach((e=>{const[t,s]=e.split(".");i[t]||(i[t]=[]),i[t].push(e)})),this._entities.temperature=this._findEntityByKeywords(i.sensor,["current_temp","temperature"]),this._entities.targetTemp=this._findEntityByKeywords(i.number,["target_temp"]),this._entities.battery=this._findEntityByKeywords(i.sensor,["battery_percent","battery"]),this._entities.liquidLevel=this._findEntityByKeywords(i.sensor,["liquid_level"]),this._entities.state=this._findEntityByKeywords(i.sensor,["state"]),this._entities.led=this._findEntityByKeywords(i.light,["led"]),this._entities.tempControl=this._findEntityByKeywords(i.switch,["temperature_control","temp_control"]),this._entities.tempPreset=this._findEntityByKeywords(i.select,["temperature_preset","temp_preset"]),this._entities.name=this._findEntityByKeywords(i.text,["name"]),this._entities.power=this._findEntityByKeywords(i.binary_sensor,["power","charging"]),!this._entities.temperature||!this._entities.state){console.warn("Ember Mug Card: Could not find all required entities via device relationship");const e=this._validateAndFillMissingEntities();e.length>0&&console.warn(`Ember Mug Card: Missing entities: ${e.join(", ")}`)}console.debug("Ember Mug Card: Initialized entities via device relationship:",this._entities)}catch(e){console.error("Ember Mug Card: Error initializing entities from device:",e),this._initializeEntitiesFromString(this.config.entity)}}_findEntityByKeywords(e,t){if(!e||!Array.isArray(e)||0===e.length)return null;for(const i of t){const t=e.find((e=>e.includes(i)));if(t)return t}return 1===e.length?e[0]:null}_initializeEntitiesFromString(e){try{const t=e.split(".");if(2!==t.length)return void console.warn(`Ember Mug Card: Invalid entity format: "${e}"`);const i=t[1],s=i.substring(0,i.lastIndexOf("_"));this._entities={temperature:`sensor.${s}_current_temp`,targetTemp:`number.${s}_target_temp`,battery:`sensor.${s}_battery_percent`,liquidLevel:`sensor.${s}_liquid_level`,state:`sensor.${s}_state`,led:`light.${s}_led`,tempControl:`switch.${s}_temperature_control`,tempPreset:`select.${s}_temperature_preset`,name:`text.${s}_name`,power:`binary_sensor.${s}_power`},this._validateAndFillMissingEntities(),console.debug("Ember Mug Card: Initialized entities via string manipulation:",this._entities)}catch(e){console.error("Ember Mug Card: Error initializing entities from string:",e)}}_validateAndFillMissingEntities(){const e=[];for(const[t,i]of Object.entries(this._entities))i&&this.hass.states[i]||(i&&console.warn(`Ember Mug Card: Entity "${i}" not found`),e.push(t));return e}_cacheCurrentEntityStates(){this._entitiesInitialized&&this.hass&&Object.entries(this._entities).forEach((([e,t])=>{if(t&&this.hass.states[t]){const e=this.hass.states[t];this._entityCache[t]={state:e.state,attributes:JSON.stringify(e.attributes)}}}))}_processStateChanges(){if(!this._entitiesInitialized||!this.hass)return;let e=!1;if(Object.entries(this._entities).forEach((([t,i])=>{if(!i||!this.hass.states[i])return;const s=this.hass.states[i],a=this._entityCache[i];if(!a)return this._entityCache[i]={state:s.state,attributes:JSON.stringify(s.attributes)},void(e=!0);const r=JSON.stringify(s.attributes);a.state===s.state&&a.attributes===r||(this._entityCache[i]={state:s.state,attributes:r},e=!0)})),e){this._updateState();const e=this.shadowRoot.querySelector("ember-mug-visualization");e&&setTimeout((()=>e.forceUpdate()),50)}}_updateState(){if(this._entitiesInitialized&&this.hass){try{const e={...this._mugState},t=this._buildStateFromEntities();this._mugState.update(t);const i=this.shadowRoot.querySelector("ember-mug-visualization");if(i){(e.temperature!==this._mugState.temperature||e.liquidLevel!==this._mugState.liquidLevel||e.state!==this._mugState.state||e.ledColorHex!==this._mugState.ledColorHex)&&setTimeout((()=>i.forceUpdate()),10)}}catch(e){console.error("Ember Mug Card: Error updating state:",e)}this.requestUpdate()}}_buildStateFromEntities(){const e=this._getEntityState("temperature"),t=this._getEntityState("targetTemp"),i=this._getEntityState("battery"),s=this._getEntityState("liquidLevel"),a=this._getEntityState("state"),r=this._getEntityState("led"),o=this._getEntityState("tempControl"),n=this._getEntityState("tempPreset"),l=this._getEntityState("name"),c=this._getEntityState("power"),h={temperature:this._getEntityValue(e),targetTemperature:this._getEntityValue(t),batteryLevel:this._getEntityValue(i),liquidLevel:this._getEntityValue(s),state:a?a.state:"unknown",temperatureControl:!!o&&"on"===o.state,temperaturePreset:n?n.state:"",isCharging:!!c&&"on"===c.state,mugName:l?l.state:"Ember Mug"};if(e&&e.attributes&&e.attributes.unit_of_measurement){const t=e.attributes.unit_of_measurement;h.temperatureUnit=t.includes("F")?"F":"C"}else if(t&&t.attributes&&t.attributes.unit_of_measurement){const e=t.attributes.unit_of_measurement;h.temperatureUnit=e.includes("F")?"F":"C"}if(r&&r.attributes.rgb_color){const e=r.attributes.rgb_color;h.ledColor=`rgb(${e[0]}, ${e[1]}, ${e[2]})`,h.ledColorHex=this._rgbToHex(e[0],e[1],e[2])}return n&&n.attributes.options&&(h.presetOptions=n.attributes.options),t&&t.attributes&&(h.minTemp=t.attributes.min||50,h.maxTemp=t.attributes.max||65),h}_handleResize(){this._isResizing||(this._isResizing=!0,this._resizeFrame=requestAnimationFrame((()=>{try{this._updateLayout()}catch(e){console.error("Ember Mug Card: Error handling resize:",e)}finally{this._isResizing=!1,this._resizeFrame=null}})))}_updateLayout(){const e=this.shadowRoot.querySelector(".card-container");if(!e)return;e.clientWidth,e.clientHeight;const t=this.shadowRoot.querySelector("ember-mug-visualization");t&&t.requestUpdate();const i=this.shadowRoot.querySelector("ember-mug-controls");i&&i.requestUpdate()}_handleScalePreview(e){if(!e.detail||"number"!=typeof e.detail.scale)return;const t=this.shadowRoot.querySelector("ember-mug-visualization");t&&(t.scale=e.detail.scale)}_getEntityState(e){if(!this._entities[e])return null;const t=this._entities[e];return this.hass.states[t]?this.hass.states[t]:(this._entityCache[t]||console.warn(`Ember Mug Card: Entity "${t}" not found in Home Assistant states`),null)}_getEntityValue(e){return e&&"unavailable"!==e.state&&"unknown"!==e.state?parseFloat(e.state):0}_handleTempControlToggle(){if(!this.hass||!this._entities.tempControl)return;const e=this._mugState.temperatureControl?"turn_off":"turn_on";this._mugState.temperatureControl=!this._mugState.temperatureControl,this.requestUpdate(),this.hass.callService("switch",e,{entity_id:this._entities.tempControl})}_handleTargetTempChange(e){if(!this.hass||!this._entities.targetTemp)return;const t=parseFloat(e.detail.value);this._mugState.setPendingTargetTemp(t),this.requestUpdate(),this.hass.callService("number","set_value",{entity_id:this._entities.targetTemp,value:t})}_handlePresetSelect(e){if(!this.hass||!this._entities.tempPreset)return;const t=e.detail.value;this._mugState.temperaturePreset=t,this.requestUpdate(),this.hass.callService("select","select_option",{entity_id:this._entities.tempPreset,option:t})}_handleLedColorChange(e){if(!this.hass||!this._entities.led)return;const t=e.detail.value;this._mugState.setPendingLedColor(t),this.requestUpdate(),this.hass.callService("light","turn_on",{entity_id:this._entities.led,rgb_color:this._hexToRgb(t)})}_hexToRgb(e){e=e.replace("#","");const t=parseInt(e,16);return[t>>16&255,t>>8&255,255&t]}_rgbToHex(e,t,i){return"#"+[e,t,i].map((e=>{const t=e.toString(16);return 1===t.length?"0"+t:t})).join("")}_handleTempSliderMove(e){this._mugState.setPendingTargetTemp(e.detail.value),this.requestUpdate()}getCardSize(){switch(this.config.layout){case"minimal":return 2;case"compact":return 3;default:return 4}}static getConfigElement(){return document.createElement("ember-mug-card-editor")}static getStubConfig(){return{entity:"sensor.ember_mug_state",layout:"default",mug_scale:1,show_current_temp:!0,show_target_temp:!0,show_temp_control:!0,show_liquid_level:!0,show_battery:!0,show_led:!0,show_state:!0,show_title:!0,show_presets:!0,show_visual:!0}}render(){if(!this.hass)return i`
        <ha-card>
          <div class="card-container">
            <div style="text-align: center; padding: 1em;">
              Loading Home Assistant data...
            </div>
          </div>
        </ha-card>
      `;if(!this.config||!this.config.entity)return i`
        <ha-card>
          <div class="card-container">
            <div style="text-align: center; padding: 1em; color: var(--error-color);">
              <ha-icon icon="mdi:alert-circle"></ha-icon>
              Invalid configuration: No entity specified
            </div>
          </div>
        </ha-card>
      `;if(!this._entitiesInitialized)return i`
        <ha-card>
          <div class="card-container">
            <div style="text-align: center; padding: 1em;">
              <ha-circular-progress active></ha-circular-progress>
              <div style="margin-top: 1em;">Connecting to Ember Mug...</div>
            </div>
          </div>
        </ha-card>
      `;const e=this.config.title||this._mugState.mugName;return i`
      <ha-card>
        <div class="card-container">
          <!-- Card Header -->
          <div class="card-header" role="heading" aria-level="3">
            ${this.config.show_title?i`<div class="title">${e}</div>`:""}
            
            ${this.config.show_state?i`
              <span class="state-badge" 
                style="background-color: ${this._mugState.getStateColor()}"
                role="status" 
                aria-label="Mug state: ${this._mugState.state.replace("_"," ")}">
                <ha-icon icon="${this._mugState.getStateIcon()}"></ha-icon>
                ${"minimal"!==this.config.layout?this._mugState.state.replace("_"," "):""}
              </span>
            `:""}
            
            ${this.config.show_battery?i`
              <div class="battery" role="status" aria-label="Battery level ${Math.round(this._mugState.batteryLevel)}${this._mugState.isCharging?", charging":""}">
                <ha-icon icon="${this._mugState.getBatteryIcon()}"></ha-icon>
                ${Math.round(this._mugState.batteryLevel)}%
                ${this._mugState.isCharging?i`<ha-icon icon="mdi:power-plug"></ha-icon>`:""}
              </div>
            `:""}
          </div>
          
          <!-- Card Content -->
          <div class="card-content">
            ${this.config.show_visual?i`
              <ember-mug-visualization
                .state=${this._mugState}
                .scale=${this.config.mug_scale||1}
              ></ember-mug-visualization>
            `:""}
            
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
    `}static get styles(){return s`
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
    `}});const a=Object.getPrototypeOf(customElements.get("ha-panel-lovelace")),{html:r,css:o}=a.prototype;customElements.define("ember-mug-card-editor",class extends a{static get properties(){return{hass:{type:Object},_config:{type:Object}}}constructor(){super(),this._config={}}setConfig(e){this._config={...e}}_standardizeConfig(){return{show_current_temp:!0,show_target_temp:!0,show_temp_control:!0,show_liquid_level:!0,show_battery:!0,show_led:!0,show_state:!0,show_title:!0,show_presets:!0,show_visual:!0,layout:"default",mug_scale:1,...this._config}}_valueChanged(e){if(!this._config)return;const t=this._standardizeConfig(),i=e.target;let s;if(e.detail&&e.detail.hasOwnProperty("value")){const a=i.configValue,r=e.detail.value;a&&(s={...t,[a]:r})}else if(i.configValue){const e=i.configValue;let a;a="ha-switch"===i.tagName.toLowerCase()||"checkbox"===i.type?i.checked:"number"===i.type?Number(i.value):i.value,s={...t,[e]:a}}s&&(this._config=s,this._fireConfigChangedEvent())}_handleMugScaleInput(e){if(!this._config)return;const t=parseFloat(e.target.value),i=this.shadowRoot.querySelector(".mug-scale-value");i&&(i.textContent=`${t.toFixed(1)}x`),this._fireScalePreviewEvent(t)}_fireScalePreviewEvent(e){const t=new CustomEvent("scale-preview",{detail:{scale:e},bubbles:!0,composed:!0});this.dispatchEvent(t)}_fireConfigChangedEvent(){const e=new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0});this.dispatchEvent(e)}static get styles(){return o`
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
    `}_renderTooltip(e){return r`
      <div class="tooltip-container">
        <ha-icon class="tooltip-icon" icon="mdi:help-circle-outline"></ha-icon>
        <span class="tooltip-text">${e}</span>
      </div>
    `}render(){if(!this.hass||!this._config)return r`<div>Loading editor...</div>`;const e=this._standardizeConfig();return Object.keys(this.hass.states).filter((e=>e.startsWith("sensor.ember_"))).sort(),r`
      <div class="card-config">
        <div class="option">
          <ha-entity-picker
            .label=${"Ember Mug Entity"}
            .hass=${this.hass}
            .value=${e.entity}
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
            .value=${e.title||""}
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
              .value=${e.layout}
              .configValue=${"layout"}
              @selected=${this._valueChanged}
              @closed=${e=>e.stopPropagation()}
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
                .value=${e.mug_scale}
                .configValue=${"mug_scale"}
                @input=${this._handleMugScaleInput}
                @change=${this._valueChanged}
              ></ha-slider>
            </div>
            <div class="value mug-scale-value">${e.mug_scale}x</div>
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
              .checked=${e.show_visual}
              .configValue=${"show_visual"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            <div class="flex">Show Mug State</div>
            <ha-switch
              .checked=${e.show_state}
              .configValue=${"show_state"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:battery"></ha-icon>
            <div class="flex">Show Battery Status</div>
            <ha-switch
              .checked=${e.show_battery}
              .configValue=${"show_battery"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:format-title"></ha-icon>
            <div class="flex">Show Card Title</div>
            <ha-switch
              .checked=${e.show_title}
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
              .checked=${e.show_current_temp}
              .configValue=${"show_current_temp"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:thermometer-lines"></ha-icon>
            <div class="flex">Show Temperature Control Switch</div>
            <ha-switch
              .checked=${e.show_temp_control}
              .configValue=${"show_temp_control"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:target"></ha-icon>
            <div class="flex">Show Target Temperature</div>
            <ha-switch
              .checked=${e.show_target_temp}
              .configValue=${"show_target_temp"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:playlist-edit"></ha-icon>
            <div class="flex">Show Temperature Presets</div>
            <ha-switch
              .checked=${e.show_presets}
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
              .checked=${e.show_liquid_level}
              .configValue=${"show_liquid_level"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
          
          <div class="row">
            <ha-icon icon="mdi:led-on"></ha-icon>
            <div class="flex">Show LED Color Control</div>
            <ha-switch
              .checked=${e.show_led}
              .configValue=${"show_led"}
              @change=${this._valueChanged}
            ></ha-switch>
          </div>
        </div>
      </div>
    `}});const n=Object.getPrototypeOf(customElements.get("ha-panel-lovelace")),{html:l,css:c}=n.prototype;customElements.define("ember-mug-visualization",class extends n{static get properties(){return{state:{type:Object,hasChanged:(e,t)=>!t||!e||(e.temperature!==t.temperature||e.liquidLevel!==t.liquidLevel||e.state!==t.state||e.ledColorHex!==t.ledColorHex||e.temperatureUnit!==t.temperatureUnit||e.pendingTargetTemp!==t.pendingTargetTemp||e.pendingLedColor!==t.pendingLedColor)},scale:{type:Number},_lastUpdate:{type:Number}}}constructor(){super(),this.state={},this.scale=1,this._lastUpdate=Date.now(),this._containerWidth=0,this._containerHeight=0,this._cardId=Math.random().toString(36).substring(2,15),this._resizeObserver=new ResizeObserver((()=>this._handleResize()))}connectedCallback(){super.connectedCallback(),setTimeout((()=>{const e=this.shadowRoot.querySelector(".mug-container");e&&this._resizeObserver.observe(e)}),10)}disconnectedCallback(){this._resizeObserver.disconnect(),super.disconnectedCallback()}_handleResize(){const e=this.shadowRoot.querySelector(".mug-container");e&&(this._containerWidth=e.clientWidth,this._containerHeight=e.clientHeight,this.requestUpdate())}forceUpdate(){this._lastUpdate=Date.now(),this.requestUpdate()}_getLiquidY(){return 86-59*((parseFloat(this.state?.liquidLevel)||0)/100)}shouldUpdate(e){return!!(e.has("state")||e.has("scale")||e.has("_lastUpdate"))||super.shouldUpdate(e)}static get styles(){return c`
      :host {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex-shrink: 0;
        max-width: 40%;
      }

      .mug-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      svg {
        overflow: visible;
        transition: width 0.3s, height 0.3s;
      }

      /* Styles for SVG elements */
      .mug-coaster {
        fill: var(--ember-coaster-color, #333);
      }

      .mug-body {
        fill: var(--ember-mug-color, #444);
      }

      .mug-inner {
        fill: var(--ember-inner-color, #222);
      }

      .mug-handle {
        stroke: var(--ember-mug-color, #444);
        stroke-width: 4;
        fill: none;
        stroke-linejoin: round;
      }

      .mug-liquid {
        opacity: 0.8;
        transition: y 0.5s, fill 1s;
      }

      .led-indicator {
        transition: fill 0.3s;
      }

      .temperature-text {
        font-family: var(--primary-font-family, sans-serif);
        font-weight: bold;
        fill: var(--text-primary-color, #fff);
        text-anchor: middle;
        dominant-baseline: middle;
      }
    `}render(){if(!this.state)return l`<div>No mug state available</div>`;const e=parseFloat(this.state.liquidLevel)||0,t=this._getLiquidY();let i="#2196f3";try{if(this.state.getStateColor&&"function"==typeof this.state.getStateColor){const e=this.state.getStateColor();e&&(i=e)}}catch(e){console.error("Error getting state color:",e)}const s=this.state.displayLedColor||this.state.ledColor||"#ffffff",a=this.state.temperature||0,r=this.state.temperatureUnit||"C",o=Math.min(3,this.scale);return l`
      <div class="mug-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="15 25 60 75"
          width="${60*o}"
          height="${75*o}"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Ember Mug visualization with ${Math.round(a)}° temperature and ${Math.round(e)}% liquid level"
          @click=${()=>this.forceUpdate()}
        >
          <!-- Define clip path using inner mug shape with unique ID per instance -->
          <defs>
            <clipPath id="inner-mug-clip-${this._cardId}">
              <path d="M25,27 h40 a2,2 0 0 1 2,2 v41 q0,12 -10,16 h-24 q-10,-4 -10,-16 v-41 a2,2 0 0 1 2,-2 z" />
            </clipPath>
          </defs>

          <!-- Mug Base (Coaster) -->
          <path
            class="mug-coaster"
            d="M16,90 h58 a2,2 0 0 1 2,2 v3 a8,8 0 0 1 -8,5 h-46 a8,8 0 0 1 -8,-5 v-3 a2,2 0 0 1 2,-2 z"
          />

          <!-- Mug Body -->
          <path
            class="mug-body"
            d="M23,25 h44 a4,4 0 0 1 4,4 v43 q0,14 -12,18 h-28 q-12,-4 -12,-18 v-43 a4,4 0 0 1 4,-4 z"
          />

          <!-- Mug Inner -->
          <path
            class="mug-inner"
            d="M25,27 h40 a2,2 0 0 1 2,2 v41 q0,12 -10,16 h-24 q-10,-4 -10,-16 v-41 a2,2 0 0 1 2,-2 z"
          />

          <!-- Liquid Level - Using a rectangle that's clipped to mug shape -->
          <rect
            class="mug-liquid"
            x="22"
            y="${t}"
            width="46"
            height="60"
            fill="${i}"
            clip-path="url(#inner-mug-clip-${this._cardId})"
          />

          <!-- Mug Handle -->
          <path
            class="mug-handle"
            d="M71,35 h7 a6,6 0 0 1 6,7 v20 a6,6 0 0 1 -6,7 h-7"
          />

          <!-- LED Indicator -->
          <ellipse
            class="led-indicator"
            cx="45"
            cy="88"
            rx="10"
            ry="1.25"
            fill="${s}"
            stroke="#444"
            stroke-width="0.5"
          />

          <!-- Temperature Display matched to control panel size -->
          <text 
            class="temperature-text" 
            x="47" 
            y="60" 
            font-size="${Math.min(Math.max(14,14*o),18)}"
          >
            ${a>0?`${Math.round(a)}°${r}`:""}
          </text>
        </svg>
      </div>
    `}});const h=Object.getPrototypeOf(customElements.get("ha-panel-lovelace")),{html:d,css:u}=h.prototype;customElements.define("ember-mug-controls",class extends h{static get properties(){return{hass:{type:Object},config:{type:Object},state:{type:Object},entities:{type:Object},layout:{type:String},visualPresent:{type:Boolean}}}constructor(){super(),this.hass={},this.config={},this.state={},this.entities={},this.layout="default",this.visualPresent=!1,this._colorPickerActive=!1,this._dropdownActive=!1}connectedCallback(){super.connectedCallback(),this.layout&&this.setAttribute("layout",this.layout),this.visualPresent?this.setAttribute("visual-present",""):this.removeAttribute("visual-present")}disconnectedCallback(){super.disconnectedCallback()}updated(e){e.has("layout")&&this.layout&&this.setAttribute("layout",this.layout),e.has("visualPresent")&&(this.visualPresent?this.setAttribute("visual-present",""):this.removeAttribute("visual-present"))}_handleTempControlToggle(){this.dispatchEvent(new CustomEvent("temp-control-toggle"))}_updateLocalTempValue(e){const t=parseFloat(e.target.value),i=this.shadowRoot.querySelector(".target-temp-value");i&&(i.textContent=`${Math.round(t)}°${this._getTemperatureUnit()}`);const s=this.shadowRoot.querySelector(".value-text");s&&(s.textContent=`${Math.round(t)}°${this._getTemperatureUnit()}`),this.state&&"function"==typeof this.state.setPendingTargetTemp&&this.state.setPendingTargetTemp(t),this.dispatchEvent(new CustomEvent("temp-slider-move",{detail:{value:t},bubbles:!0,composed:!0}))}_handleTargetTempChange(e){const t=parseFloat(e.target.value);this.dispatchEvent(new CustomEvent("target-temp-change",{detail:{value:t}}))}_handleColorPickerFocus(){this._colorPickerActive=!0}_handleLedColorChange(e){e.stopPropagation(),this._colorPickerActive=!1;const t=e.target.value;this.dispatchEvent(new CustomEvent("led-color-change",{detail:{value:t}}))}_handleDropdownOpen(e){e.stopPropagation(),this._dropdownActive=!0,setTimeout((()=>{const t=e.currentTarget,i=this.shadowRoot.querySelector("mwc-menu");i&&(i.style.position="fixed",i.style.zIndex="999",i.anchor=t,i.corner="BOTTOM_START")}),50)}_handleDropdownClosed(e){setTimeout((()=>{this._dropdownActive=!1}),100)}_handlePresetSelect(e){const t=e.target.value;""!==t&&"none"!==t&&(this.state.presetOptions?.includes(t)?this.dispatchEvent(new CustomEvent("preset-select",{detail:{value:t}})):console.warn(`Selected preset "${t}" is not in available options:`,this.state.presetOptions))}_getTemperatureUnit(){return this.state.temperatureUnit||"C"}_renderMinimalControls(){const{config:e,state:t,entities:i}=this,s=this._getTemperatureUnit();return d`
      <div class="control-row">
        ${e.show_current_temp?d`
          <ha-icon icon="mdi:thermometer" aria-hidden="true"></ha-icon>
          <span aria-label="Current temperature ${Math.round(t.temperature)}°${s}">${Math.round(t.temperature)}°${s}</span>
        `:""}
        
        ${e.show_liquid_level?d`
          <ha-icon icon="${t.getLiquidLevelIcon()}" aria-hidden="true"></ha-icon>
          <span aria-label="Liquid level ${Math.round(t.liquidLevel)}%">${Math.round(t.liquidLevel)}%</span>
        `:""}
        
        ${i.led&&e.show_led?d`
          <ha-icon icon="mdi:led-variant-on" aria-hidden="true"></ha-icon>
          <input 
            type="color" 
            class="color-picker" 
            .value="${t.displayLedColor}"
            aria-label="LED Color"
            @change="${this._handleLedColorChange}"
            @focus="${this._handleColorPickerFocus}"
            @click="${e=>e.stopPropagation()}"
          >
        `:""}
        
        ${i.tempControl&&e.show_temp_control?d`
          <ha-icon icon="mdi:thermometer-lines" aria-hidden="true"></ha-icon>
          <div 
            class="temp-control-switch" 
            role="switch"
            aria-checked="${t.temperatureControl}"
            aria-label="Temperature control ${t.temperatureControl?"on":"off"}"
            tabindex="0"
            ?checked="${t.temperatureControl}"
            @click="${this._handleTempControlToggle}"
            @keydown="${e=>"Enter"===e.key&&this._handleTempControlToggle()}">
          </div>
        `:""}
      </div>
      
      ${i.targetTemp&&t.temperatureControl&&e.show_target_temp?d`
        <div class="control-row">
          <ha-slider
            min="${t.minTemp}"
            max="${t.maxTemp}"
            step="0.5"
            .value="${t.displayTargetTemp}"
            aria-label="Target temperature ${Math.round(t.displayTargetTemp)}°${s}"
            @input="${this._updateLocalTempValue}"
            @change="${this._handleTargetTempChange}">
          </ha-slider>
          <span class="target-temp-value">${Math.round(t.displayTargetTemp)}°${s}</span>
        </div>
      `:""}
    `}_renderDefaultControls(){const{config:e,state:t,entities:i}=this,s=this._getTemperatureUnit();return d`
      ${e.show_current_temp?d`
        <div class="control-row">
          <ha-icon icon="mdi:thermometer" aria-hidden="true"></ha-icon>
          <span class="label">Current Temperature</span>
          <span aria-label="Current temperature ${Math.round(t.temperature)}°${s}">${Math.round(t.temperature)}°${s}</span>
        </div>
      `:""}
        
      ${i.tempControl&&e.show_temp_control?d`
        <div class="control-row">
          <ha-icon icon="mdi:thermometer-lines" aria-hidden="true"></ha-icon>
          <span class="label">Temperature Control</span>
          <div 
            class="temp-control-switch" 
            role="switch"
            aria-checked="${t.temperatureControl}"
            aria-label="Temperature control ${t.temperatureControl?"on":"off"}"
            tabindex="0"
            ?checked="${t.temperatureControl}"
            @click="${this._handleTempControlToggle}"
            @keydown="${e=>"Enter"===e.key&&this._handleTempControlToggle()}">
          </div>
        </div>
      `:""}
        
      ${i.targetTemp&&t.temperatureControl&&e.show_target_temp?d`
        <div class="control-row">
          <ha-icon icon="mdi:target" aria-hidden="true"></ha-icon>
          <span class="label">Target Temperature</span>
          <span class="value-text">${Math.round(t.displayTargetTemp)}°${s}</span>
        </div>
        <div class="control-row">
          <ha-slider
            min="${t.minTemp}"
            max="${t.maxTemp}"
            step="0.5"
            .value="${t.displayTargetTemp}"
            aria-label="Target temperature slider"
            @input="${this._updateLocalTempValue}"
            @change="${this._handleTargetTempChange}">
          </ha-slider>
        </div>
      `:""}
      
      ${e.show_presets&&i.tempPreset&&t.temperatureControl&&t.presetOptions?.length>0?d`
        <div class="control-row two-line">
          <ha-icon icon="mdi:playlist-edit" aria-hidden="true"></ha-icon>
          <span class="label two-line">
            Temperature
            <br>Preset
          </span>
          <ha-select
            .value="${t.temperaturePreset}"
            fixedMenuPosition
            naturalMenuWidth
            aria-label="Temperature preset"
            @click="${this._handleDropdownOpen}"
            @closed="${this._handleDropdownClosed}"
            @selected="${this._handlePresetSelect}"
          >
            <mwc-list-item value="none" selected disabled style="display:none;"></mwc-list-item>
            ${t.presetOptions.map((e=>d`
              <mwc-list-item .value="${e}">
                ${e.replace("-"," ")}
              </mwc-list-item>
            `))}
          </ha-select>
        </div>
      `:""}
      
      ${e.show_liquid_level?d`
        <div class="control-row">
          <ha-icon icon="${t.getLiquidLevelIcon()}" aria-hidden="true"></ha-icon>
          <span class="label">Liquid Level</span>
          <span aria-label="Liquid level ${Math.round(t.liquidLevel)}%">${Math.round(t.liquidLevel)}%</span>
        </div>
        <div class="progress-bar" 
             role="progressbar" 
             aria-valuenow="${Math.round(t.liquidLevel)}" 
             aria-valuemin="0" 
             aria-valuemax="100">
          <div class="progress-value" style="width: ${t.liquidLevel}%"></div>
        </div>
      `:""}
      
      ${e.show_led&&i.led?d`
        <div class="control-row">
          <ha-icon icon="mdi:led-variant-on" aria-hidden="true"></ha-icon>
          <span class="label">LED Color</span>
          <input 
            type="color" 
            class="color-picker" 
            .value="${t.displayLedColor}"
            aria-label="LED Color"
            @change="${this._handleLedColorChange}"
            @focus="${this._handleColorPickerFocus}"
            @click="${e=>e.stopPropagation()}"
          >
        </div>
      `:""}
    `}static get styles(){return u`
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
    `}render(){return this.state&&this.config?d`
      <div class="controls-container" aria-label="Ember mug controls">
        ${"minimal"===this.layout?this._renderMinimalControls():this._renderDefaultControls()}
      </div>
    `:d`<div>Loading controls...</div>`}}),window.customCards||(window.customCards=[]),window.customCards.push({type:"ember-mug-card",name:"Ember Mug Card",description:"A custom card for controlling and monitoring Ember Mug devices",preview:!1,documentationURL:"https://github.com/flight-lab/ember-mug-card"}),console.info("%c EMBER MUG CARD %c v1.0.0 ","color: white; background: #c85000; font-weight: 700;","color: #c85000; background: white; font-weight: 700;");
