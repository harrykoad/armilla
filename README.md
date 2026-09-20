# Armilla

**Armilla** is an interactive web-based celestial-sphere application for astronomy education. It supports the study of coordinate systems, sidereal astronomy, observer-based sky geometry, and the changing appearance of the sky across locations and historical epochs.

## Overview

Armilla models the sky for a selected location, date, and time. It allows users to examine the relationship between the local horizon, celestial equator, ecliptic, zodiac, stars, Sun, Moon, planets, lunar nodes, and selected astronomical phenomena.

Armilla is not only a sky viewer. It presents the astronomical structure behind observation, including spherical geometry, sidereal reference frames, precession, coordinate transformation, and the changing appearance of the sky from different places on Earth.

## Modules

### Armilla

Armilla is the project's main educational application. It models the celestial sphere for a selected location, date, and time, helping users understand coordinate systems, observer-based sky geometry, sidereal time, precession, and the apparent positions of stars, the Sun, Moon, and planets.

```text
https://harrykoad.github.io/armilla/
```

### Astrolabe

Astrolabe is an interactive astronomical module for exploratory archaeoastronomical research. A user can enter the measured orientation and horizon altitude of a sacred site, monument, temple, or other structure, apply an uncertainty range, and identify stars or nakṣatras whose rising or setting directions intersect that range.

Astrolabe plots how stellar rising and setting azimuths change across historical epochs because of precession. It estimates possible alignment year ranges and calculates approximate acronychal-rising and cosmical-setting dates. Each calculated event can be opened in Armilla for visual inspection of the corresponding sky, location, date, and time.

```text
https://harrykoad.github.io/armilla/astrolabe.html
```

## Astronomical Basis

Armilla is based on principles from spherical astronomy, positional astronomy, and traditional sidereal sky reckoning. Calendar date and civil time are converted into Julian Day, including the fractional day, and then into Julian Century relative to the J2000.0 epoch. These values are used as time arguments for sidereal time, obliquity, ayanāṃśa, and celestial body computations.

The application connects horizontal, equatorial, nirāyana ecliptic, and galactic coordinate system concepts through vector and matrix transformations. These transformations account for observer latitude, longitude, local sidereal time, Earth’s axial tilt, and sidereal offset.

A central feature of Armilla is its use of nirāyana, an Indian sidereal ecliptic coordinate system in which zodiacal longitude is measured along the ecliptic against a fixed reference. Armilla defines the First Point of Aries (FPA) as fixed to the position of the vernal equinox at the J500.0 epoch, then applies an ayanāṃśa correction to relate tropical and nirāyana longitudes. This allows users to study fixed-star references, zodiacal divisions, precession, and the difference between tropical and sidereal sky systems.

Armilla includes long-term precessional change for interpreting historical sky positions. Because the equinox shifts gradually against the fixed-star background, the relationship between tropical and sidereal coordinates changes over historical time. The model treats this long-term precessional component, while the negligibly small nutation term is not included.

Although stars are conventionally described as “fixed,” Armilla and Astrolabe account for their catalogued proper motions when calculating positions at different epochs. This is especially important in Astrolabe's long-term analysis, where accumulated stellar motion can affect a star's calculated rising and setting directions.

Both modules also account for atmospheric refraction when that option is enabled. Armilla applies refraction to apparent horizontal positions, while Astrolabe converts the entered apparent horizon altitude to the corresponding geometric altitude using the selected temperature and pressure. This keeps horizon-crossing and rising or setting calculations consistent with the displayed observational conditions.

The observer is modeled from geodetic latitude and longitude, with Earth shape parameters used for topocentric geometry. This supports local horizon, zenith, meridian, rising and setting directions, and visible-sky relationships from a specific place on Earth.

## Educational Tool

Armilla is intended as a visual teaching and learning environment for celestial sphere geometry. It can help explain how the horizon, equator, ecliptic, zodiac, stars, Sun, Moon, and planets relate to one another in different coordinate systems.

The application is useful for classroom demonstrations, self-study, and preparation of explanatory diagrams. By changing date, time, latitude, longitude, and viewing orientation, users can explore how the apparent sky depends on both time and observer location.

Draw mode allows users to annotate directly on the sky view, making it possible to mark alignments, highlight coordinate relationships, trace apparent paths, or prepare teaching illustrations. Black and white background modes support classroom projection, documentation, screen capture, and different presentation contexts.

Armilla can support lessons on local sidereal time, obliquity, precession, ayanāṃśa, topocentric observation, lunar nodes, eclipses, analemma, atmospheric halo geometry, rainbow geometry, and coordinate graticules.

## Archaeoastronomical Research

Astrolabe supports exploratory archaeoastronomical work by comparing a measured site orientation with the changing rising and setting directions of selected stars and nakṣatras. This can help researchers identify astronomical candidates for further investigation and estimate the historical periods during which an alignment may have occurred.

This approach may be useful when studying sacred sites, ancient monuments, temples, ritual landscapes, orientation traditions, and cultural associations with prominent stars or lunar mansions. Long-term plots make the effects of precession visible, while Armilla provides a celestial-sphere reconstruction for closer examination of a selected event.

Armilla's supplementary diagrams extend this interpretive use. Its horary-style view arranges zodiacal divisions, stars, constellation references, and celestial positions in a compact form, providing another way to inspect relationships relevant to traditional astronomy and historical sky interpretation.

Astrolabe identifies astronomical possibilities, not archaeological conclusions. A correspondence between a structure's orientation and a stellar rising or setting direction does not by itself demonstrate intentional alignment. Interpretation still requires reliable field measurements, local horizon-altitude data, chronological evidence, cultural context, atmospheric-refraction considerations, and independent ephemeris verification.

## Technical Implementation

The Armilla project is built with HTML, CSS, JavaScript, and the HTML5 Canvas API. Its modules run entirely in the browser and do not require a server-side runtime.

The modules use consistent models for stellar positions, precession, atmospheric refraction, horizon geometry, sidereal time, and calendar conversion. This allows an event identified analytically in Astrolabe to be examined coherently in Armilla. The codebase separates astronomical computation, coordinate transformation, rendering, user interaction, supplementary diagrams, and application state management into focused files.

```text
armilla/
├── index.html       # Armilla celestial-sphere application
├── astrolabe.html   # Stellar orientation and historical-epoch analysis
├── astro.js         # Stellar, solar-system, lunar, and observer calculations
├── coord.js         # Time, refraction, horizon, and coordinate calculations
├── draw.js          # Celestial-sphere canvas projection and rendering
├── event.js         # Armilla interface interactions and controls
├── math.js          # Numerical, vector, matrix, angle, and formatting utilities
├── modal.js         # Horary, lunar, and supplementary diagrams
├── sphere.js        # Celestial-sphere objects and overlays
└── state.js         # Application state, defaults, colors, and display settings
```

## Scope and Accuracy

Armilla is intended for astronomy education, visualization, and conceptual study. Astrolabe is intended for exploratory analysis of possible historical stellar orientations. Its long-term curves account for precession and catalogued stellar proper motion, and its horizon calculations can include atmospheric refraction under the selected conditions. Reported event dates are numerical estimates and may differ by up to one day for a selected historical year.

Neither module is intended to replace high-precision ephemeris systems, observatory-grade astrometric software, navigation tools, archaeological evidence, or formal archaeoastronomical field analysis without independent verification.

## Author

**Peeravit Koad**

School of Informatics, Walailak University, Nakhon Si Thammarat, Thailand

## License

This project is available for educational and non-commercial use only.

Commercial use, resale, redistribution for profit, or incorporation into commercial products or services is not permitted without prior written permission from the author.
