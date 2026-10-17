struct GlobalUniforms {
    modelMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
}

// --- GROUP 0: Core Per-draw Engine State---
@group(0) @binding(0)
var<uniform> uGlobals: GlobalUniforms;

// --- GROUP 1: Texture Bindings ---
@group(1) @binding(0)
var ourSample: sampler;
@group(1) @binding(1)
var ourTexture: texture_2d<f32>;

struct VertIn {
    @location(0) position: vec3<f32>,
    @location(1) texcoord: vec2<f32>,
}

struct VertOut {
    @builtin(position) position: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
}

@vertex
fn vs_main(input: VertIn) -> VertOut {
    var output: VertOut;
    let worldPosition = vec4f(input.position, 1.0);
    output.position = uGlobals.projectionMatrix * uGlobals.viewMatrix * uGlobals.modelMatrix
        * worldPosition;
    output.texcoord = input.texcoord;

    return output;
}

struct FragIn {
    @builtin(position) position: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
}

struct FragOut {
    @location(0) color: vec4<f32>,
}

@fragment
fn fs_main(input: FragIn) -> FragOut {
    var output: FragOut;
    output.color = textureSample(ourTexture, ourSample, input.texcoord);
    return output;
}
