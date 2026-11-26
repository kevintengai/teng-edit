import {colorKey, colorKeySchema, type ColorKeyParams} from '@remotion/effects/color-key';
import {createEffect} from 'remotion';

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5), 16) / 255];
}

const vertex = `#version 300 es
out vec2 uv;
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 keyed;
uniform sampler2D image;
uniform vec3 screen;
uniform vec3 controls;

// Hue in degrees, saturation and value. Saturation and value qualify the hue of dark or gray pixels.
vec3 hsv(vec3 c) {
  float v = max(max(c.r, c.g), c.b), d = v - min(min(c.r, c.g), c.b);
  if (d < 0.0001) return vec3(0.0, 0.0, v);
  float h = v == c.r ? (c.g-c.b)/d : v == c.g ? 2.0+(c.b-c.r)/d : 4.0+(c.r-c.g)/d;
  return vec3(mod(60.0*h+360.0, 360.0), d/v, v);
}
void main() {
  vec4 pixel = texture(image, uv);
  vec3 color = pixel.rgb / max(pixel.a, 0.0001);
  vec3 sampleHsv = hsv(color), keyHsv = hsv(screen);
  float delta = abs(sampleHsv.x-keyHsv.x);
  float hueDistance = min(delta, 360.0-delta);
  float band = controls.x * 60.0, feather = max(0.05, controls.y * 60.0);
  float matchesHue = 1.0 - smoothstep(max(0.0, band-feather), band+feather, hueDistance);
  float chroma = smoothstep(keyHsv.y*0.32, keyHsv.y*0.70, sampleHsv.y);
  float lit = smoothstep(0.012, 0.065, sampleHsv.z);
  float matte = matchesHue * chroma * lit;
  float alpha = pixel.a * (1.0-matte);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 clean = mix(color, vec3(luma), controls.z * matte);
  keyed = vec4(clean * alpha, alpha);
}`;

function setup(target: HTMLCanvasElement) {
  const gl = target.getContext('webgl2', {alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true});
  if (!gl) throw new Error('The presenter hue key needs WebGL2.');
  const program = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Key shader compilation failed.');
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Key shader link failed.');
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return {gl, program, texture, screen: gl.getUniformLocation(program, 'screen'), controls: gl.getUniformLocation(program, 'controls')};
}

const hueKey = createEffect<ColorKeyParams, ReturnType<typeof setup>>({
  type: 'org.tengedit.hueKey', label: 'Presenter hue key', documentationLink: null,
  backend: 'webgl2', schema: colorKeySchema, setup,
  calculateKey: ({keyColor = '#00ff00', similarity = .18, smoothness = .08, spillSuppression = .25}) =>
    [keyColor, similarity, smoothness, spillSuppression].join('/'),
  validateParams: (params) => {
    colorKey(params);
    if (params.keyColor && !/^#[0-9a-f]{6}$/i.test(params.keyColor)) throw new Error('Use a six-digit hex screen color.');
  },
  apply: ({source, width, height, params, state, flipSourceY}) => {
    const {gl, program, texture} = state;
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipSourceY);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
    gl.uniform3f(state.screen, ...rgb(params.keyColor ?? '#00ff00'));
    gl.uniform3f(state.controls, params.similarity ?? .18, params.smoothness ?? .08, params.spillSuppression ?? .25);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },
  cleanup: ({gl, program, texture}) => { gl.deleteProgram(program); gl.deleteTexture(texture); },
});

export function presenterKey(params: ColorKeyParams) {
  const channels = rgb(params.keyColor ?? '#00ff00');
  const max = Math.max(...channels);
  // Near-neutral screens have no stable hue. Use the native RGB-distance key for those samples.
  return max > .06 && (max-Math.min(...channels))/max >= .25 ? hueKey(params) : colorKey(params);
}
