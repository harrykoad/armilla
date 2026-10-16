# The Armilla Project

The Armilla Project combines three complementary browser-based astronomical modules:

- **Armilla** is an interactive celestial sphere for astronomy education and visual exploration.
- **Astrolabe** is an analytical tool for exploratory archaeoastronomical research.
- **Astrotide** predicts station-specific sea level from astronomical forcing and displays the underlying forcing time series.

All three modules run locally in a modern web browser and can be hosted as a static website. No server-side runtime is required for normal use.

## Armilla for Astronomical Education

Armilla models the sky for a selected location, date, and time. It presents the relationships among the local horizon, celestial equator, ecliptic, zodiac, stars, Sun, Moon, planets, lunar nodes, and selected astronomical phenomena.

The module supports classroom demonstrations, self-study, and the preparation of explanatory diagrams. Users can change the date, time, observer location, and viewing orientation to explore spherical geometry, coordinate systems, sidereal reference frames, precession, and the changing appearance of the sky.

Draw mode allows annotations to be added directly to the celestial-sphere view. Black and white background modes support projection, documentation, and screen capture.

Armilla can support lessons on local sidereal time, obliquity, precession, ayanāṃśa, topocentric observation, lunar nodes, eclipses, analemmas, atmospheric halo geometry, rainbow geometry, and coordinate graticules.

```text
https://harrykoad.github.io/armilla/
```

## Astrolabe for Archaeoastronomical Research

Astrolabe examines how stellar and nakṣatra rising and setting directions change across historical epochs. A user can enter the measured orientation and horizon altitude of a sacred site, monument, temple, or other structure, apply an uncertainty range, and identify stars or Indian lunar mansions whose acronychal-rising or cosmical-setting directions intersect that range.

The module estimates possible alignment-year ranges and approximate event dates. Each computed event can be opened in Armilla for visual inspection of the corresponding sky, location, date, and time.

Astrolabe identifies astronomical possibilities, not archaeological conclusions. A correspondence between a structure's orientation and an astronomical direction does not by itself demonstrate intentional alignment. Interpretation also requires reliable field measurements, local horizon data, chronological evidence, cultural context, atmospheric-refraction considerations, and independent ephemeris verification.

```text
https://harrykoad.github.io/armilla/astrolabe.html
```

## Astrotide for Astronomical Sea Level Prediction

Astrotide displays predicted sea level for tide-gauge stations together with the astronomical quantities used by the prediction model. Stations can be selected by country, first-level administrative division, name, and data source. When coordinates without a station are entered, the nearest available station is selected using spherical distance.

Each station uses its own fitted model. The model combines hourly lunisolar tide-generating acceleration components, estimated clear-sky global horizontal irradiance, nonlinear terms, and cross terms over the preceding 30 days. Lag-dependent coefficients are represented by cubic splines and expanded when the station model is loaded. Only one station model is retained in memory at a time.

The sea level graph includes the station model's prediction, local minima and maxima, the current trend, and a three-RMSE uncertainty band. The astronomical-forcing graph displays vertical tide-generating acceleration and clear-sky irradiance over the same time window.

Astrotide is experimental. Historical records differ among stations in duration, continuity, quality, and recency, so predictions may be unreliable. The predictions must not be used for navigation, hazard response, engineering, or other safety-critical decisions.

```text
https://harrykoad.github.io/armilla/astrotide.html
```

## Astronomical Basis

The project is based on spherical astronomy, positional astronomy, and traditional sidereal sky reckoning. Calendar date and civil time are converted to Julian Day and Julian Century relative to J2000.0. These values provide the time arguments for sidereal time, obliquity, ayanāṃśa, solar-system positions, and other astronomical computations.

Armilla connects horizontal, equatorial, nirāyaṇa ecliptic, and galactic coordinate systems through vector and matrix transformations. The transformations account for observer latitude and longitude, local sidereal time, Earth's axial tilt, and sidereal offset.

The project defines the First Point of Aries as fixed to the position of the vernal equinox at the J500.0 epoch, then applies an ayanāṃśa correction to relate tropical and nirāyaṇa longitude. Long-term precession and catalogued stellar proper motions are included where relevant. The negligibly small nutation term is not included.

Armilla can apply atmospheric refraction to apparent horizontal positions. Astrolabe converts an entered apparent horizon altitude to its corresponding geometric altitude using the selected temperature and pressure. The observer is modeled from geodetic latitude and longitude with Earth-shape parameters used for topocentric geometry.

Astrotide computes lunisolar tide-generating acceleration in the local east, north, and up directions. These astronomical predictors describe forcing rather than local hydrodynamics directly; station-specific fitted coefficients capture the response represented in the available historical observations.

## Technical Implementation

The web application is built with HTML, CSS, JavaScript, and the HTML5 Canvas API. Shared files provide astronomical computation, coordinate transformation, rendering, interaction, modal controls, and application state.

Astrotide station metadata and fitted prediction models are JavaScript assets so that the module works from static hosting and when opened locally without fetching JSON. A station's model file is loaded only when needed.

```text
armilla/
├── index.html                    # Armilla celestial-sphere module
├── astrolabe.html                # Historical stellar-orientation analysis
├── astrotide.html                # Astronomical sea level prediction module
├── astro.js                      # Stellar, solar-system, lunar, and observer calculations
├── coord.js                      # Time, refraction, horizon, and coordinate calculations
├── draw.js                       # Celestial-sphere projection and rendering
├── event.js                      # Armilla interactions and controls
├── math.js                       # Numerical, vector, matrix, angle, and formatting utilities
├── modal.js                      # Shared date, time, location, and supplementary diagrams
├── sphere.js                     # Celestial-sphere objects and overlays
├── state.js                      # Shared state, defaults, colors, and display settings
└── astrotide/
    ├── astrotide.js              # Astrotide interface, forcing, model loading, and plots
    ├── metadata.js               # Browser-readable station metadata
    └── models/
        └── PLUSCODE.js           # Fitted model loaded for one station at a time
```

### Local Astrotide Development Files

The following are local data-processing, fitting, and diagnostic artifacts and are not required by the deployed website:

```text
astrotide/data/                   # Raw station data and local data-preparation outputs
astrotide/**/*.py                 # Downloading, updating, and fitting scripts
astrotide/**/*.png                # Diagnostic plots and generated maps
```

The fitted `astrotide/models/*.js` files are web assets and must remain available to Astrotide. Do not exclude them from deployment.

## Scope and Accuracy

Armilla is intended for astronomy education, visualization, and conceptual study. Astrolabe is intended for exploratory analysis of possible historical stellar orientations. Astrotide is intended for experimental astronomical sea level prediction from station-specific historical data.

These modules do not replace high-precision ephemerides, observatory-grade astrometric software, navigation systems, official tide services, hazard-warning systems, archaeological evidence, or formal field analysis. Results should be independently verified before they are used outside education and exploration.

## Author

**Peeravit Koad**

School of Informatics, Walailak University, Nakhon Si Thammarat, Thailand

## License

This project is available for educational and non-commercial use only.

Commercial use, resale, redistribution for profit, or incorporation into commercial products or services is not permitted without prior written permission from the author.
