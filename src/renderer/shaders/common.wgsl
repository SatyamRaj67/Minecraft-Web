struct GlobalUniforms {
    modelMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
}

// --- GROUP 0: Core Per-draw Engine State---
@group(0) @binding(0)
var<uniform> uGlobals: GlobalUniforms;

struct VertIn {
    @builtin(vertex_index) vertexIndex: u32,
}

struct VertOut {
    @builtin(position) position: vec4<f32>,
}

@vertex
fn vs_main(input: VertIn) -> VertOut {
    var output: VertOut;
    var positions = array(
        vec3f(-0.7, -0.5, 0.0),
        vec3f(0.7, -0.5, 0.0),
        vec3f(0.0, 0.7, 0.0),
        );

    let worldPosition = vec4f(positions[input.vertexIndex], 1.0);
    output.position =
        uGlobals.projectionMatrix *
        uGlobals.viewMatrix *
        uGlobals.modelMatrix *
        worldPosition;

    return output;
}

struct FragOut {
    @location(0) color: vec4<f32>,
}

@fragment
fn fs_main() -> FragOut {
    var output: FragOut;
    output.color = vec4f(1.0, 0.0, 0.0, 1.0);
    return output;
}
