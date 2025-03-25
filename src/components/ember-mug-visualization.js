// Get HA's LitElement instead of importing from CDN
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const { html, css } = LitElement.prototype;

/**
 * Ember Mug Visualization Component
 * 
 * Renders an SVG visualization of the Ember Mug with current state
 * 
 * @customElement ember-mug-visualization
 * @litElement
 */
export class EmberMugVisualization extends LitElement {
  static get properties() {
    return {
      state: {
        type: Object,
        hasChanged(newVal, oldVal) {
          // Force update on any state change by checking individual properties
          if (!oldVal || !newVal) return true;

          // Compare individual properties that affect visualization
          return newVal.temperature !== oldVal.temperature ||
            newVal.liquidLevel !== oldVal.liquidLevel ||
            newVal.state !== oldVal.state ||
            newVal.ledColorHex !== oldVal.ledColorHex ||
            newVal.temperatureUnit !== oldVal.temperatureUnit ||
            (newVal.pendingTargetTemp !== oldVal.pendingTargetTemp) ||
            (newVal.pendingLedColor !== oldVal.pendingLedColor);
        }
      },
      scale: { type: Number },
      // Add an explicit lastUpdate timestamp to force rerenders
      _lastUpdate: { type: Number }
    };
  }

  constructor() {
    super();
    this.state = {};
    this.scale = 1.0;
    this._lastUpdate = Date.now();

    // Track container size
    this._containerWidth = 0;
    this._containerHeight = 0;

    // Create a unique ID for this instance (needed for clipPath)
    this._cardId = Math.random().toString(36).substring(2, 15);

    // Create resize observer
    this._resizeObserver = new ResizeObserver(() => this._handleResize());
  }

  /**
   * Called when element is connected to DOM
   */
  connectedCallback() {
    super.connectedCallback();

    // Set up resize observer with slight delay to ensure DOM is ready
    setTimeout(() => {
      const container = this.shadowRoot.querySelector('.mug-container');
      if (container) {
        this._resizeObserver.observe(container);
      }
    }, 10);
  }

  /**
   * Called when element is disconnected from DOM
   */
  disconnectedCallback() {
    // Clean up observer
    this._resizeObserver.disconnect();
    super.disconnectedCallback();
  }

  /**
   * Handle container resize
   * @private
   */
  _handleResize() {
    const container = this.shadowRoot.querySelector('.mug-container');
    if (!container) return;

    // Update stored dimensions
    this._containerWidth = container.clientWidth;
    this._containerHeight = container.clientHeight;

    // Request update to adjust SVG viewBox
    this.requestUpdate();
  }

  /**
   * Explicitly update the visualization
   * This can be called from the parent component
   */
  forceUpdate() {
    this._lastUpdate = Date.now();
    this.requestUpdate();
  }

  /**
   * Calculate the position of the liquid based on level percentage
   * We'll use this to set the height of the liquid rectangle
   * 
   * @private
   * @returns {number} Y position in SVG units
   */
  _getLiquidY() {
    // Define mug dimensions for consistency
    const innerMugTop = 27;
    const innerMugBottom = 86;
    const totalHeight = innerMugBottom - innerMugTop;

    // Ensure liquidLevel is a valid number (force parsing in case it's a string)
    const liquidLevel = parseFloat(this.state?.liquidLevel) || 0;

    // Calculate liquid top Y position based on percentage
    // A full mug (100%) should place the top of the liquid at innerMugTop
    // An empty mug (0%) should place the top of the liquid at innerMugBottom
    const fillPercentage = liquidLevel / 100;
    return innerMugBottom - (totalHeight * fillPercentage);
  }

  /**
   * Special update lifecycle method to force render on ANY state change
   */
  shouldUpdate(changedProps) {
    // Always update when state changes, scale changes, or lastUpdate changes
    if (changedProps.has('state') || changedProps.has('scale') || changedProps.has('_lastUpdate')) {
      return true;
    }
    return super.shouldUpdate(changedProps);
  }

  /**
   * Styles for the visualization component
   */
  static get styles() {
    return css`
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
    `;
  }

  /**
   * Render the SVG mug visualization
   */
  render() {
    // Safety check for required props
    if (!this.state) return html`<div>No mug state available</div>`;

    // Ensure we have a valid liquid level (force to number)
    const liquidLevel = parseFloat(this.state.liquidLevel) || 0;

    // Calculate liquid Y position
    const liquidY = this._getLiquidY();

    // Get colors from state
    let stateColor = "#2196f3"; // Default blue for liquid
    try {
      if (this.state.getStateColor && typeof this.state.getStateColor === 'function') {
        const color = this.state.getStateColor();
        if (color) {
          stateColor = color;
        }
      }
    } catch (e) {
      console.error("Error getting state color:", e);
    }

    const ledColor = this.state.displayLedColor || this.state.ledColor || "#ffffff";
    const temperature = this.state.temperature || 0;
    const temperatureUnit = this.state.temperatureUnit || 'C';

    // Scale the SVG proportionally based on container size
    const baseWidth = 60;
    const baseHeight = 75;
    const scaleFactor = Math.min(3, this.scale);
    const scaledWidth = baseWidth * scaleFactor;
    const scaledHeight = baseHeight * scaleFactor;

    return html`
      <div class="mug-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="15 25 60 75"
          width="${scaledWidth}"
          height="${scaledHeight}"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Ember Mug visualization with ${Math.round(temperature)}° temperature and ${Math.round(liquidLevel)}% liquid level"
          @click=${() => this.forceUpdate()}
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
            y="${liquidY}"
            width="46"
            height="60"
            fill="${stateColor}"
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
            fill="${ledColor}"
            stroke="#444"
            stroke-width="0.5"
          />

          <!-- Temperature Display matched to control panel size -->
          <text 
            class="temperature-text" 
            x="45" 
            y="60" 
            font-size="${Math.min(Math.max(14, 14 * scaleFactor), 16)}"
          >
            ${temperature > 0
        ? `${Math.round(temperature)}°${temperatureUnit}`
        : ""}
          </text>
        </svg>
      </div>
    `;
  }
}

customElements.define("ember-mug-visualization", EmberMugVisualization);