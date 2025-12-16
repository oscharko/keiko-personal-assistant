Analyze the reference image located at `particle-cloud/speek-cloud.jpg` to understand the desired visual design.

**Design Requirements:**
The blue particle cloud should symbolize continuous creation and dissolution:

- **Core behavior**: Particles are generated/born at the center of the cloud
- **Edge behavior**: Particles dissolve into fine individual particles as they move outward
- **Purpose**: This particle cloud represents the audio component of a speech-to-text model
- **Animation**: When the model speaks, the particle cloud should pulsate in response to the audio signal to visualize
  the voice

**Parameterization Requirements:**
To achieve the most perfect visualization possible, the following aspects must be controllable via parameters:

- Shape/form of the particle cloud
- Color (base color)
- Color gradient (transition from core to edges)
- Particle size (individual particle dimensions)
- Any other relevant visual properties that affect the appearance and behavior

**Task:**

1. Analyze the current implementation in `particle-cloud/particle-cloud-demo.html`
2. Compare it against the reference image `particle-cloud/speek-cloud.jpg` and the requirements above
3. Identify all gaps and deviations from the requirements
4. Modify the implementation to fulfill 100% of the requirements, ensuring:
    - Visual fidelity matches the reference image
    - All parameters are exposed and configurable
    - Audio-reactive pulsation is properly implemented
    - Particle lifecycle (creation at core, dissolution at edges) works as specified