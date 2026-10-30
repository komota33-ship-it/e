shader_type canvas_item;
render_mode blend_mix;

uniform float edge_strength : hint_range(0.0, 1.5) = 1.18;

void fragment() {
	vec4 center = texture(TEXTURE, UV);
	vec2 step_uv = TEXTURE_PIXEL_SIZE;
	vec3 surrounding = (
		texture(TEXTURE, UV + vec2(step_uv.x, 0.0)).rgb +
		texture(TEXTURE, UV - vec2(step_uv.x, 0.0)).rgb +
		texture(TEXTURE, UV + vec2(0.0, step_uv.y)).rgb +
		texture(TEXTURE, UV - vec2(0.0, step_uv.y)).rgb
	) * 0.25;
	vec3 sharper = clamp(center.rgb + (center.rgb - surrounding) * edge_strength, 0.0, 1.0);
	COLOR = vec4(floor(sharper * 32.0 + 0.5) / 32.0, center.a);
}
