/**
 * Ember Mug Card for Home Assistant
 *
 * A custom Lovelace card that integrates with the Ember Mug custom component
 * for Home Assistant, providing a beautiful visualization and controls for
 * Ember Mug devices.
 *
 * @author Flight-Lab
 * @version 1.0.0
 * @license MIT
 */

// Import model first (needed by components)
import "./models/ember-mug-state.js";

// Import components (they register themselves)
import "./ember-mug-card.js";
import "./ember-mug-card-editor.js";
import "./components/ember-mug-visualization.js";
import "./components/ember-mug-controls.js";

// Register the card with Home Assistant
if (!window.customCards) {
  window.customCards = [];
}

window.customCards.push({
  type: "ember-mug-card",
  name: "Ember Mug Card",
  description:
    "A custom card for controlling and monitoring Ember Mug devices",
  preview: false,
  documentationURL: "https://github.com/flight-lab/ember-mug-card",
});

// Log card information to the console
console.info(
  "%c EMBER MUG CARD %c v1.0.0 ",
  "color: white; background: #c85000; font-weight: 700;",
  "color: #c85000; background: white; font-weight: 700;"
);
