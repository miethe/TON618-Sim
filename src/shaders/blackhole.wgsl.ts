export const blackholeWGSL = `
struct Uniforms {
    resolution: vec2<f32>,
    cameraPos: vec3<f32>,
    cameraDir: vec3<f32>,
    cameraUp: vec3<f32>,
    time: f32,
    viewMode: f32,
    wavelength: f32,
    showMilkyWay: f32,
    showJets: f32,
    pad1: f32,
    pad2: f32,
    pad3: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
    );
    var out: VertexOutput;
    out.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    out.uv = pos[vertexIndex] * 0.5 + vec2<f32>(0.5);
    out.uv.y = 1.0 - out.uv.y;
    return out;
}

// Hash and Noise functions
fn hash33(p3_in: vec3<f32>) -> vec3<f32> {
    var p3 = fract(p3_in * vec3<f32>(0.1031, 0.1030, 0.0973));
    var d = dot(p3, p3.yxz + vec3<f32>(33.33, 33.33, 33.33));
    p3 += vec3<f32>(d, d, d);
    return fract((p3.xxy + p3.yxx) * p3.zyx);
}

fn noise(p: vec3<f32>) -> f32 {
    var i = floor(p);
    var f = fract(p);
    f = f * f * (vec3<f32>(3.0, 3.0, 3.0) - 2.0 * f);
    return mix(
        mix(mix(hash33(i + vec3<f32>(0.0,0.0,0.0)).x, hash33(i + vec3<f32>(1.0,0.0,0.0)).x, f.x),
            mix(hash33(i + vec3<f32>(0.0,1.0,0.0)).x, hash33(i + vec3<f32>(1.0,1.0,0.0)).x, f.x), f.y),
        mix(mix(hash33(i + vec3<f32>(0.0,0.0,1.0)).x, hash33(i + vec3<f32>(1.0,0.0,1.0)).x, f.x),
            mix(hash33(i + vec3<f32>(0.0,1.0,1.0)).x, hash33(i + vec3<f32>(1.0,1.0,1.0)).x, f.x), f.y), f.z
    );
}

fn fbm(p: vec3<f32>) -> f32 {
    var f = 0.0;
    var scale = 1.0;
    var pos = p;
    for(var i=0; i<4; i++) {
        f += noise(pos) * scale;
        pos *= 2.0;
        scale *= 0.5;
    }
    return f;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var uv = (in.uv - vec2<f32>(0.5)) * 2.0;
    uv.x *= u.resolution.x / u.resolution.y;

    var ro = u.cameraPos;
    var ww = normalize(u.cameraDir);
    var uu = normalize(cross(ww, u.cameraUp));
    var vv = normalize(cross(uu, ww));
    var rd = normalize(uv.x * uu + uv.y * vv + 1.0 * ww); // 1.0 FOV

    var p = ro;
    var v = rd;
    
    // Dynamic step size based on scale
    var base_dt = 0.05;
    var max_dist = 600.0;
    var diskOuter = 25.0;
    var max_steps = 500;
    var noiseFreq = 2.0;
    var jetOuter = 30.0;

    var col = vec3<f32>(0.0);
    var transmit = 1.0;
    let RS = 1.0;

    for(var i=0; i<500; i++) {
        var r2 = dot(p, p);
        var r = sqrt(r2);

        if (r < RS) {
            // Event horizon
            break;
        }

        var hit_bg = (r > max_dist) || (i == max_steps - 1 && r > 3.0);
        
        if (hit_bg) {
            // Background stars
            var star = pow(noise(v * 200.0), 25.0) * 2.0;
            col += vec3<f32>(star) * transmit;
            break;
        }

        // Adaptive step size: smaller near the black hole for accurate lensing, larger further away
        var dt = base_dt;
        var r_dist = max(0.0, r - RS);
        dt = min(2.0, base_dt * (1.0 + r_dist * 0.3));

        // Gravity bending (approximated null geodesic)
        var h = cross(p, v);
        var h2 = dot(h, h);
        var accel = -1.5 * h2 * p / (r2 * r2 * r);
        v = normalize(v + accel * dt);
        p += v * dt;

        // Accretion Disk rendering
        var distToDisk = abs(p.y);
        var diskThickness = 0.5 * max(1.0, r * 0.1);

        if (distToDisk < diskThickness && r > RS * 1.5 && r < diskOuter) {
            var dens = smoothstep(diskThickness, 0.0, distToDisk);
            
            // Swirl inwards and around (Keplerian-ish)
            var angle = atan2(p.z, p.x) - u.time * 1.5 / sqrt(r);
            var r_anim = r + u.time * 2.0; // move noise inwards
            var rotP = vec3<f32>(cos(angle)*r_anim, p.y, sin(angle)*r_anim);

            dens *= fbm(rotP * noiseFreq);

            if (dens > 0.01) {
                // Doppler beaming
                var velDir = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), p));
                var velMag = sqrt(RS / (2.0 * r));
                var doppler = 1.0 + dot(v, velDir) * velMag * 2.5;
                doppler = max(0.1, doppler);

                var temp = 1.0 / (r - RS + 0.1);
                var emitColor = vec3<f32>(1.0, 0.6, 0.2); // Visible default

                if (u.wavelength == 1.0) { // X-Ray
                    emitColor = vec3<f32>(0.1, 0.5, 1.0);
                } else if (u.wavelength == 2.0) { // Radio
                    emitColor = vec3<f32>(1.0, 0.1, 0.1);
                } else if (u.wavelength == 3.0) { // IR
                    emitColor = vec3<f32>(0.8, 0.2, 0.0);
                }

                if (u.viewMode == 1.0) { // Gravity Grid
                    emitColor = vec3<f32>(0.0, 1.0, 0.5);
                    var grid = smoothstep(0.0, 0.1, fract(r - u.time)) * 
                               smoothstep(0.0, 0.1, fract(atan2(p.z, p.x) * 4.0));
                    dens = grid * 0.2;
                    doppler = 1.0;
                } else if (u.viewMode == 2.0) { // Matter Density
                    emitColor = vec3<f32>(dens, dens*0.5, 1.0-dens);
                    doppler = 1.0;
                } else if (u.viewMode == 3.0) { // Time/Energy
                    var timeDilation = sqrt(max(0.001, 1.0 - RS/r));
                    emitColor = mix(vec3<f32>(1.0,0.0,0.0), vec3<f32>(0.0,0.5,1.0), timeDilation);
                    doppler = 1.0;
                }

                var emit = emitColor * dens * pow(doppler, 3.0) * temp * 20.0;
                var alpha = 1.0 - exp(-dens * dt * 2.0);

                col += transmit * emit * alpha;
                transmit *= (1.0 - alpha);
            }
        }

        // Relativistic Jets
        var cylindricalRadius = length(vec2<f32>(p.x, p.z));
        var jetRadius = 0.5 + r * 0.05; // Highly collimated
        
        if (u.showJets > 0.5 && r > RS && cylindricalRadius < jetRadius && abs(p.y) > RS * 0.5) {
            var jetDens = fbm(p * noiseFreq * 2.0 - vec3<f32>(0.0, sign(p.y)*u.time*15.0, 0.0)) * 0.15;
            jetDens *= smoothstep(jetRadius, 0.0, cylindricalRadius);
            jetDens *= smoothstep(jetOuter, RS, r);
            
            var jetColor = vec3<f32>(0.2, 0.5, 1.0);
            if (u.wavelength == 1.0) { jetColor = vec3<f32>(0.8, 0.9, 1.0); }
            else if (u.wavelength == 2.0) { jetColor = vec3<f32>(0.1, 0.1, 0.8); }
            else if (u.wavelength == 3.0) { jetColor = vec3<f32>(0.3, 0.1, 0.1); }

            if (u.viewMode == 1.0) { jetDens = 0.0; } // Hide in gravity mode
            if (u.viewMode == 2.0) { jetColor = vec3<f32>(1.0, 0.0, 0.0); }

            var alpha = 1.0 - exp(-jetDens * dt);
            col += transmit * jetColor * jetDens * 10.0 * alpha;
            transmit *= (1.0 - alpha);
        }

        // Holographic Milky Way Asset
        if (u.showMilkyWay > 0.5) {
            var mw_y = p.y + 20.0; // 20 units below the black hole
            var mw_dist = abs(mw_y);
            var mw_thickness = 2.0 + cylindricalRadius * 0.02; // Gets thicker at the edges
            
            if (mw_dist < mw_thickness && cylindricalRadius < 250.0) {
                var angle = atan2(p.z, p.x);
                var arm = sin(angle * 4.0 - cylindricalRadius * 0.05 + u.time * 0.2);
                var mw_dens = smoothstep(-0.2, 1.0, arm) * exp(-cylindricalRadius * 0.015) * smoothstep(mw_thickness, 0.0, mw_dist);
                mw_dens *= (0.5 + 0.5 * fbm(p * 0.1));
                
                if (mw_dens > 0.01) {
                    var mw_color = mix(vec3<f32>(1.0, 0.8, 0.5), vec3<f32>(0.2, 0.5, 1.0), smoothstep(0.0, 50.0, cylindricalRadius));
                    
                    // Add a grid line effect to make it look like a holographic projection
                    var grid = smoothstep(0.95, 1.0, fract(cylindricalRadius * 0.1)) + smoothstep(0.98, 1.0, fract(angle * 8.0 / 3.14159));
                    mw_color += vec3<f32>(0.0, 1.0, 0.5) * grid * 0.5;
                    
                    var emit = mw_color * mw_dens * 1.5;
                    var alpha = 1.0 - exp(-mw_dens * dt * 0.5);
                    col += transmit * emit * alpha;
                    transmit *= (1.0 - alpha);
                }
            }
        }
        
        if (transmit < 0.01) { break; }
    }

    // Tonemapping (ACES-like)
    col = (col * (2.51 * col + vec3<f32>(0.03))) / (col * (2.43 * col + vec3<f32>(0.59)) + vec3<f32>(0.14));
    col = clamp(col, vec3<f32>(0.0), vec3<f32>(1.0));

    return vec4<f32>(col, 1.0);
}
`;
