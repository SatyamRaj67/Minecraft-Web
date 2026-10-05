struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    var positions = array<vec2<f32>, 3>(
            vec2<f32>(0.0, 0.5),
            vec2<f32>(-0.5, -0.5),
            vec2<f32>(0.5, -0.5),
        );
    var colors = array<vec4<f32>, 3>(
            vec4<f32>(1.0, 0.0, 0.0, 1.0),
            vec4<f32>(0.0, 1.0, 0.0, 1.0),
            vec4<f32>(0.0, 0.0, 1.0, 1.0),
        );

    out.position = vec4<f32>(positions[input.vertexIndex], 0.0, 1.0);
    out.color = colors[input.vertexIndex];
    return out;
}

struct FragInput {
    @location(0) color: vec4<f32>,
}

struct FragOutput {
    @location(0) color: vec4<f32>,
}

@fragment
fn fs_main(input: FragInput) -> FragOutput {
    var out: FragOutput;
    out.color = input.color;
    return out;
}
