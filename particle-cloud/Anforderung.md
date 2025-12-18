Analyze the reference image located at `particle-cloud/speek-cloud.jpg` to understand the target visual design for a
particle cloud animation system.

**Design Requirements:**
Create a blue particle cloud animation that symbolizes continuous creation and dissolution with the following specific
behaviors:

- **Core behavior**: Particles must be generated/spawned at the center point of the cloud
- **Outward movement**: Particles must move radially outward from the center
- **Edge behavior**: As particles approach the outer edges, they must dissolve/fade into fine individual particles
- **Purpose**: This particle cloud represents the audio component of a speech-to-text model
- **Audio-reactive animation**: When the model speaks, the particle cloud must pulsate dynamically in response to the
  audio signal amplitude/frequency to visualize the voice activity

**Parameterization Requirements:**
The implementation must expose configurable parameters for the following aspects to enable fine-tuning of the
visualization:

- **Shape/form**: Overall geometry and distribution pattern of the particle cloud (e.g., spherical, elliptical,
  cloud-like)
- **Base color**: Primary color of the particles (currently blue, but should be configurable)
- **Color gradient**: Color transition from the core to the outer edges (e.g., bright blue at center fading to
  transparent at edges)
- **Particle size**: Dimensions of individual particles (both at spawn and as they dissolve)
- **Particle count**: Number of active particles in the system
- **Movement speed**: Velocity at which particles move outward from the center
- **Dissolution rate**: How quickly particles fade/dissolve as they reach the edges
- **Pulsation intensity**: Magnitude of the audio-reactive pulsation effect
- **Any other visual properties**: Opacity, glow/blur effects, spawn rate, lifetime, etc.

**Task:**

1. **Analyze the current implementation**: Examine the existing code in `particle-cloud/particle-cloud-demo.html` to
   understand the current particle system architecture, rendering approach, and any existing parameters
2. **Compare against requirements**:
    - Open and study the reference image `particle-cloud/speek-cloud.jpg` to understand the target visual aesthetic
    - Identify visual characteristics: particle density, color scheme, shape, distribution pattern, edge effects
    - Compare the current implementation's visual output against the reference image
3. **Identify gaps and deviations**: Create a comprehensive list of all differences between the current implementation
   and the requirements, including:
    - Missing features (e.g., audio-reactive pulsation, particle lifecycle management)
    - Visual discrepancies (color, shape, particle behavior)
    - Missing or incomplete parameterization
    - Performance or rendering issues
4. **Implement required modifications**: Update `particle-cloud/particle-cloud-demo.html` to achieve 100% compliance
   with all requirements:
    - Ensure visual output matches the reference image `particle-cloud/speek-cloud.jpg`
    - Implement particle lifecycle: spawn at center, move outward, dissolve at edges
    - Implement audio-reactive pulsation that responds to audio signal input
    - Expose all required parameters as configurable variables (ideally through a configuration object or UI controls)
    - Ensure smooth animation performance
    - Add inline code comments explaining key implementation details

**Deliverable:**
A fully functional particle cloud visualization that matches the reference image and meets all specified requirements
with complete parameterization support.