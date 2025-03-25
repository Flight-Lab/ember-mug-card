# Ember Mug Card

A custom Lovelace card for Home Assistant that works with the [Ember Mug Integration](https://github.com/sopelj/hass_ember_mug) to provide a rich interface for monitoring and controlling your Ember Mug.

<!-- ![Ember Mug Card Preview](preview.png) -->

## Features

- Visual representation of your Ember Mug's state
- Shows real-time temperature, liquid level, and battery percentage
- Control mug temperature settings
- Toggle temperature control
- Change LED color
- Select temperature presets
- Multiple layout options (Default, Compact, Minimal)
- Fully customizable - show/hide any elements

## Installation

### HACS (Recommended)

1. Make sure [HACS](https://hacs.xyz/) is installed in your Home Assistant instance
2. Add this repository as a custom repository in HACS:
   - Go to HACS → Frontend
   - Click on the three dots in the top right corner
   - Select "Custom repositories"
   - Add the URL `https://github.com/yourusername/ember-mug-card` (replace with actual repository URL)
   - Select Category: "Lovelace"
3. Click "Install" next to "Ember Mug Card" in the HACS store
4. Refresh your browser cache

### Manual Installation

1. Download the `ember-mug-card.js` file from the latest release
2. Upload it to your Home Assistant config directory in `/www/ember-mug-card/`
3. Add a resource reference to your Lovelace configuration:

```yaml
resources:
  - url: /local/ember-mug-card/ember-mug-card.js
    type: module
```

4. Refresh your browser cache

## Usage

Add the card to your dashboard:

```yaml
type: custom:ember-mug-card
entity: sensor.ember_mug_state
# Optional configuration
title: My Ember Mug
layout: default # or compact, minimal
show_led: true
show_battery: true
show_liquid_level: true
show_current_temp: true
show_target_temp: true
show_temp_control: true
show_presets: true
show_state: true
show_title: true
show_visual: true
mug_scale: 1.0
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **Required** | Main Ember Mug entity |
| `title` | string | `null` | Custom card title (defaults to mug name if empty) |
| `layout` | string | `default` | Layout style (`default`, `compact`, or `minimal`) |
| `mug_scale` | number | `1.0` | Scale factor for the mug visualization |
| `show_visual` | boolean | `true` | Show mug visualization |
| `show_title` | boolean | `true` | Show card title |
| `show_state` | boolean | `true` | Show mug state indicator |
| `show_battery` | boolean | `true` | Show battery percentage |
| `show_current_temp` | boolean | `true` | Show current temperature |
| `show_target_temp` | boolean | `true` | Show target temperature control |
| `show_temp_control` | boolean | `true` | Show temperature control toggle |
| `show_presets` | boolean | `true` | Show temperature presets dropdown |
| `show_liquid_level` | boolean | `true` | Show liquid level indicator |
| `show_led` | boolean | `true` | Show LED color control |

## Prerequisites

This card requires:
- The [Ember Mug Integration](https://github.com/sopelj/hass_ember_mug) properly set up

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to [Jesse Sopel](https://github.com/sopelj) for creating the Ember Mug Integration
