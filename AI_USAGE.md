# AI Usage Disclosure — Skyline Luxury Residences

## Overview

I used AI tools as part of my development workflow to accelerate early scaffolding, explore the 3D direction, and help integrate generated 3D assets into the application. I remained responsible for the project requirements, deciding which outputs were suitable, inspecting the running UI, identifying defects, and iterating on the implementation. AI-generated code and assets were treated as drafts that required review rather than as automatically correct deliverables.

## Tools and how I used them

### ChatGPT

Used to help establish the initial application/template direction, break the assignment into implementation tasks, reason through architecture and performance trade-offs, and troubleshoot visual or interaction problems. I also used it to turn visual observations into specific, testable change requests.

### Claude

Used to help create and refine 3D model/scene content for the architectural experience. I evaluated the resulting geometry and camera presentation against the intended luxury-residential look and the requirement for independently addressable floors and facade parts.

### Qoder

Used to assist with integrating the 3D models into the existing application. I reviewed how the models fit the established scene and scroll choreography, then inspected the resulting application for UI, positioning, and camera issues.

## My development and review process

1. I used the assignment as the source of requirements and broke the experience into the landing hero, five scroll-driven scenes, property discovery flow, and the required API-backed features.
2. I used AI suggestions and generated assets to accelerate selected implementation tasks, but evaluated them against the required behaviour, project architecture, and visual direction.
3. I ran the application and reviewed the rendered result instead of judging success only from generated code. I used screenshots to pinpoint UI alignment, contrast, model composition, and camera-angle problems.
4. When a result did not meet the intended quality, I rejected it or requested a targeted correction instead of accepting it as finished. I prioritized preserving working parts of the project and limiting unrelated changes.
5. I treated runtime behaviour, tests, and measured performance as the evidence for completion; a generated response alone was not considered verification.

## Representative prompts that were useful

The examples below are representative of the prompts used in this workflow; wording may be condensed rather than a verbatim transcript.

### 1. Procedural 3D architecture and scroll choreography

> Build the Skyline tower as 24 individually addressable floor groups, each with separate facade panels. Use a single scroll-progress timeline for Arrival, Build-up, Inside a Home, Amenities, and Call to Action. During the interior reveal, open only `Floor_12/Facade_Front`; keep the other floor facades closed. Keep camera movement, pinned room labels, and amenity overlays synchronized, and ensure reverse scrolling restores the same state.

**Why it helped:** It translated a broad visual goal into explicit scene hierarchy and acceptance criteria, making it easier to review the model and animations against specific requirements.

### 2. Luxury amenity image

> Create a photorealistic luxury residential amenity scene for a premium real-estate website: a resort-style swimming pool within the landscaped podium of a modern residential tower, turquoise water, natural-stone edges, premium loungers, mature trees and garden pathways, glass-and-stone architecture with warm interior lighting, and golden-hour reflections. Use realistic materials and restrained cinematic grading; no people, text, logos, or watermarks.

**Why it helped:** The specific materials, setting, light, and exclusions produced a coherent visual brief for a property-website asset rather than a generic pool image.

### 3. Visual debugging from screenshots

> Review this screenshot of the running Skyline page against the target experience. Identify the concrete differences in contrast, composition, camera angle, geometry and text placement. Recommend the smallest focused change that addresses the observed defect without changing unrelated routes or API behaviour. State what should be checked in the browser after the change.

**Why it helped:** It kept debugging tied to visible evidence and reduced the chance of applying a broad redesign when a targeted correction was needed.

## An AI-assisted result that was wrong, and how I caught it

An early generated cinematic version did not meet the required visual quality. In the running page, the scene appeared washed out, the tower read as a simple repetitive box, and the camera composition/angle did not present the architecture convincingly. Some UI overlays also competed with the scene. This was not obvious from reading the proposed code alone.

I caught the problems by inspecting the rendered page and using a screenshot to point out the specific visual defects. I rejected that version rather than applying it to the working project, and clarified that the 3D experience needed a stronger architectural composition, controlled contrast, and a hero-floor reveal that remained consistent with the scene requirements. This reinforced the need to verify AI-assisted work in the actual application instead of assuming generated output is correct.

## Responsibility and verification

I am responsible for the final source, design choices, integration decisions, and the claims made about the project. Where AI assisted with a template, 3D model, or integration, I disclose that use. Any claim about successful builds, automated tests, bundle size, Lighthouse scores, or frame rate must be backed by an actual run or measurement; it should not be inferred from AI-generated code or recommendations.
