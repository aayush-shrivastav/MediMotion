import React, { useEffect, useRef, useState, useMemo } from 'react';
import FrontbodyMapped from '../assets/logo/FrontBodyMapped.svg';

// CSS Color for highlighting
const HIGHLIGHT_COLOR = 'hsla(241, 100%, 59%, 1.00)'; // Medical Blue/Purple highlight

const BodyPartSimulator = ({ activeExercises = [] }) => {
    const svgRef = useRef(null);
    const [svgContent, setSvgContent] = useState(null);

    // Map exercise names to SVG element IDs
    const selectedParts = useMemo(() => {
        const parts = new Set();
        // Ensure input is an array
        const exercises = Array.isArray(activeExercises) ? activeExercises : [activeExercises];

        exercises.forEach(ex => {
            if (!ex) return;
            const exercise = ex.toLowerCase();

            if (exercise.includes('squat')) {
                parts.add('Thigh_R');
                parts.add('Thigh_L');
            }
            if (exercise.includes('press')) {
                parts.add('Shoulder_R');
                parts.add('Shoulder_L');
            }
            if (exercise.includes('curl')) {
                parts.add('Bicep_R');
                parts.add('Bicep_L');
            }
            if (exercise.includes('walking')) {
                parts.add('Thigh_R');
                parts.add('Thigh_L');
                parts.add('Calf_R');
                parts.add('Calf_L');
                parts.add('Foot_R');
                parts.add('Foot_L');
            }
        });

        return Array.from(parts);
    }, [activeExercises]);

    useEffect(() => {
        fetch(FrontbodyMapped)
            .then(res => res.text())
            .then(text => setSvgContent(text))
            .catch(err => console.error("Error loading body map SVG:", err));
    }, []);

    useEffect(() => {
        if (!svgRef.current || !svgContent) return;

        const svgDoc = svgRef.current; // This is the container div
        const svg = svgDoc.querySelector('svg');

        // Selector for group elements that represent body parts
        // Based on SVG structure: <g id="Thigh_R"> ... </g>
        if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.maxHeight = '80vh';
            svg.style.objectFit = 'contain';
        }

        const allGroups = svgDoc.querySelectorAll('g[id]');

        allGroups.forEach(g => {
            const partId = g.id;
            // Skip mask definitions or non-body parts if any
            if (!partId) return;

            const paths = g.querySelectorAll('path, rect, circle');

            // Check if this part should be highlighted
            const isSelected = selectedParts.includes(partId);

            paths.forEach(p => {
                // Store original fill if not already stored
                if (!p.hasAttribute('data-original-fill')) {
                    const currentFill = p.getAttribute('fill') || p.style.fill || '';
                    p.setAttribute('data-original-fill', currentFill);
                }

                if (isSelected) {
                    p.style.fill = HIGHLIGHT_COLOR;
                    p.style.opacity = '0.8'; // Slight transparency to show texture if possible
                } else {
                    // Restore original fill
                    p.style.fill = '';
                    p.style.opacity = '';
                    // If the original was a url(...) reference, setting style.fill = '' should revert to attribute
                }
            });
        });

    }, [selectedParts, svgContent]);



    if (!svgContent) return <div>Loading Body Model...</div>;

    return (
        <div
            className="body-part-simulator"
            ref={svgRef}
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
            }}
        />
    );
};

export default BodyPartSimulator;
