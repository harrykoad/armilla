# Armilla

**Armilla** is an interactive web-based astronomical visualization tool for studying the celestial sphere, coordinate systems, sidereal astronomy, and observer-based sky geometry. It is designed for education, visual interpretation, and exploratory archaeoastronomical study.

```text id="1"
https://harrykoad.github.io/armilla/
```

## Overview

Armilla models the sky for a selected location, date, and time. It allows users to examine the relationship between the local horizon, celestial equator, ecliptic, zodiac, fixed stars, Sun, Moon, planets, lunar nodes, and selected astronomical phenomena.

The application is not only a sky viewer. It presents the astronomical structure behind observation, including spherical geometry, sidereal reference frames, precession, coordinate transformation, and the changing appearance of the sky from different places on Earth.

## Astronomical Basis

Armilla is based on principles from spherical astronomy, positional astronomy, and traditional sidereal sky reckoning. Calendar date and civil time are converted into Julian Day, including the fractional day, and then into Julian Century relative to the J2000.0 epoch. These values are used as time arguments for sidereal time, obliquity, ayanāṃśa, and celestial body computations.

The application connects horizontal, equatorial, nirāyana ecliptic, and galactic coordinate system concepts through vector and matrix transformations. These transformations account for observer latitude, longitude, local sidereal time, Earth’s axial tilt, and sidereal offset.

A central feature of Armilla is its use of nirāyana, an Indian sidereal ecliptic coordinate system in which zodiacal longitude is measured along the ecliptic against a fixed reference. Armilla defines the First Point of Aries (FPA) as fixed to the position of the vernal equinox at the J500.0 epoch, then applies an ayanāṃśa correction to relate tropical and nirāyana longitudes. This allows users to study fixed-star references, zodiacal divisions, precession, and the difference between tropical and sidereal sky systems.

Armilla includes long-term precessional change for interpreting historical sky positions. Because the equinox shifts gradually against the fixed-star background, the relationship between tropical and sidereal coordinates changes over historical time. The model treats this long-term precessional component, while the negligibly small nutation term is not included.

The observer is modeled from geodetic latitude and longitude, with Earth shape parameters used for topocentric geometry. This supports local horizon, zenith, meridian, rising and setting directions, and visible-sky relationships from a specific place on Earth.

## Educational Tool

Armilla is intended as a visual teaching and learning environment for celestial sphere geometry. It can help explain how the horizon, equator, ecliptic, zodiac, stars, Sun, Moon, and planets relate to one another in different coordinate systems.

The application is useful for classroom demonstrations, self-study, and preparation of explanatory diagrams. By changing date, time, latitude, longitude, and viewing orientation, users can explore how the apparent sky depends on both time and observer location.

Draw mode allows users to annotate directly on the sky view, making it possible to mark alignments, highlight coordinate relationships, trace apparent paths, or prepare teaching illustrations. Black and white background modes support classroom projection, documentation, screen capture, and different presentation contexts.

Armilla can support lessons on local sidereal time, obliquity, precession, ayanāṃśa, topocentric observation, lunar nodes, eclipses, analemma, atmospheric halo geometry, rainbow geometry, and coordinate graticules.

## Archaeoastronomical Relevance

Armilla can support exploratory archaeoastronomical work by visualizing historical sky configurations, horizon geometry, sidereal references, and celestial alignments for selected locations and dates.

It may be useful for examining solar, lunar, stellar, and zodiacal relationships connected with ancient monuments, ritual landscapes, orientation studies, fixed-star traditions, and long-term precessional change.

The modal views extend this interpretive use by providing supplementary astronomical diagrams beyond the main celestial sphere. One modal view presents a horary-style chart that arranges zodiacal divisions, stars, constellation references, and celestial positions in a compact form. This gives users another way to inspect symbolic, geometric, and positional relationships that may be relevant to traditional astronomy and historical sky interpretation.

Armilla should be used as a visual and interpretive aid. Formal archaeoastronomical conclusions still require field measurement, horizon-altitude data, atmospheric refraction consideration, historical chronology, and independent ephemeris verification.

## Example

A specific sky configuration can be shared through URL parameters:

```text id="2"
https://harrykoad.github.io/armilla/?lat=8.64&lon=99.90&date=1996-03-29&time=15:30&modal=true
```

## Technical Implementation

Armilla is a client-side web application built with HTML, CSS, JavaScript, and the HTML5 Canvas API. It runs entirely in the browser and does not require a server-side runtime.

The codebase separates astronomical computation, coordinate transformation, rendering, user interaction, modal diagrams, and application state management into individual JavaScript modules.

```text id="3"
armilla/
├── index.html      # Main page, interface, and web metadata
├── astro.js        # Solar system, lunar, and observer computations
├── coord.js        # Julian Day, sidereal time, obliquity, ayanāṃśa, and coordinate transforms
├── draw.js         # Canvas projection and rendering
├── event.js        # User interaction, drawing mode, and display controls
├── math.js         # Vector, matrix, angle, and formatting utilities
├── modal.js        # Horary chart and auxiliary modal diagrams
├── sphere.js       # Celestial sphere overlays and sky objects
└── state.js        # Application state, defaults, colors, and display settings
```

## Scope and Accuracy

Armilla is intended for education, visualization, and exploratory interpretation. Its computations are suitable for conceptual study, classroom demonstration, and visual analysis of astronomical geometry.

It is not intended to replace high-precision ephemeris systems, observatory-grade astrometric software, navigation tools, or formal archaeoastronomical field analysis without independent verification.

## Author

**Peeravit Koad**

School of Informatics, Walailak University, Nakhon Si Thammarat, Thailand

## License

This project is available for educational and non-commercial use only.

Commercial use, resale, redistribution for profit, or incorporation into commercial products or services is not permitted without prior written permission from the author.
