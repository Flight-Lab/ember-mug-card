export default {
  presets: [
    ['@babel/preset-env', {
      targets: '> 0.25%, not dead',
      modules: false  // Important for ES modules
    }]
  ]
};
