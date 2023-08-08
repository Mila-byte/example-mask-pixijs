import {
  Container,
  Graphics,
  Sprite,
  Text,
  Geometry,
  Shader,
  Mesh,
  Texture,
} from 'pixi.js';
import { RenderTexture } from '@pixi/core';
import { APP_WIDTH, APP_HEIGHT, APP_CENTER_X, APP_CENTER_Y } from './config';
import { RenderPrepare } from './application-scene';
import gsap from 'gsap';

export class MaskExample extends Container {
  private text: Text;
  private bg: Graphics;
  private maskBg: Graphics;
  private maskContainer: Container;
  constructor() {
    super();
    this.createMaskContainer();
    this.createWhiteBg();
    this.animatedText();
    this.testWater();
  }

  private createMaskContainer(): void {
    this.maskContainer = new Container();
    this.createMaskBg();
    this.createText();
  }

  private createText(): void {
    this.text = new Text('EXAMPLE MASK', {
      fontSize: 200,
      fill: 0x000000,
      fontWeight: 'bold',
    });
    this.text.anchor.set(0.5);
    this.text.position.set(APP_CENTER_X, APP_CENTER_Y);
    this.maskContainer.addChild(this.text);
  }

  private createMaskBg(): void {
    this.maskBg = new Graphics()
      .beginFill(0xffffff)
      .drawRect(0, 0, APP_WIDTH, APP_HEIGHT);
    this.maskContainer.addChild(this.maskBg);
  }

  private createWhiteBg(): void {
    this.bg = new Graphics()
      .beginFill(0xffffff)
      .drawRect(0, 0, APP_WIDTH, APP_HEIGHT);
    this.bg.alpha = 0.75;
    const textTexture = RenderPrepare.renderer.generateTexture(
      this.maskContainer
    );
    const mask = new Sprite(textTexture);
    this.bg.addChild(mask);
    this.bg.mask = mask;
    this.bg.pivot.set(APP_WIDTH / 2, APP_HEIGHT / 2);
    this.bg.position.set(APP_CENTER_X, APP_CENTER_Y);
    this.addChild(this.bg);
  }

  private animatedText(): void {
    gsap.to(this.bg.scale, {
      // x: '+=0.2',
      // y: '+=0.2',
      // duration: 0.5,
      // yoyo: true,
      // yoyoEase: 'linear',
      // repeat: -1,
      //how to update text?
      // onUpdate: () => {
      //   RenderPrepare.renderer.render(this.text, {
      //     renderTexture: RenderTexture.create({
      //       width: this.text.width,
      //       height: this.text.height,
      //     }),
      //   });
      // },
    });
  }

  private testWater(): void {
    const geometry = new Geometry()
      .addAttribute(
        'aVertexPosition', // the attribute name
        [
          -100,
          -100, // x, y
          100,
          -100, // x, y
          100,
          100,
          -100,
          100,
        ], // x, y
        2
      ) // the size of the attribute
      .addAttribute(
        'aUvs', // the attribute name
        [
          0,
          0, // u, v
          1,
          0, // u, v
          1,
          1,
          0,
          1,
        ], // u, v
        2
      ) // the size of the attribute
      .addIndex([0, 1, 2, 0, 2, 3]);

    const vertexSrc = `

    precision mediump float;

    attribute vec2 aVertexPosition;
    attribute vec2 aUvs;

    uniform mat3 translationMatrix;
    uniform mat3 projectionMatrix;

    varying vec2 vUvs;

    void main() {
        vUvs = aUvs;
        gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    }`;
    const fragmentSrc = `
    precision mediump float;
    varying vec2 vUvs;
    uniform float iTime;

    #define DRAG_MULT 0.28 // changes how much waves pull on the water
    #define WATER_DEPTH 1.0 // how deep is the water
    #define CAMERA_HEIGHT 1.5 // how high the camera should be
    #define ITERATIONS_RAYMARCH 12 // waves iterations of raymarching
    #define ITERATIONS_NORMAL 40 // waves iterations when calculating normals
    
    // Calculates wave value and its derivative,
    // for the wave direction, position in space, wave frequency and time
    vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
      float x = dot(direction, position) * frequency + timeshift;
      float wave = exp(sin(x) - 1.0);
      float dx = wave * cos(x);
      return vec2(wave, -dx);
    }
    
    // Calculates waves by summing octaves of various waves with various parameters
    const float max_its = 100.;
    float getwaves(vec2 position, int iterations) {
      float iter = 0.0; // this will help generating well distributed wave directions
      float frequency = 1.0; // frequency of the wave, this will change every iteration
      float timeMultiplier = 2.0; // time multiplier for the wave, this will change every iteration
      float weight = 1.0;// weight in final sum for the wave, this will change every iteration
      float sumOfValues = 0.0; // will store final sum of values
      float sumOfWeights = 0.0; // will store final sum of weights
      for(int i=0; i< int(max_its); i++) {
        vec2 p = vec2(sin(iter), cos(iter));
        vec2 res = wavedx(position, p, frequency, iTime * timeMultiplier);
    
        position += p * res.y * weight * DRAG_MULT;
    
        sumOfValues += res.x * weight;
        sumOfWeights += weight;
    
        weight *= 0.82;
        frequency *= 1.18;
        timeMultiplier *= 1.07;
    
        iter += 1232.399963;
      }
      // calculate and return
      return sumOfValues / sumOfWeights;
    }
    
    // Raymarches the ray from top water layer boundary to low water layer boundary
    float raymarchwater(vec3 camera, vec3 start, vec3 end, float depth) {
      vec3 pos = start;
      vec3 dir = normalize(end - start);
      for(int i=0; i < 64; i++) {
        // the height is from 0 to -depth
        float height = getwaves(pos.xz, ITERATIONS_RAYMARCH) * depth - depth;
        // if the waves height almost nearly matches the ray height, assume its a hit and return the hit distance
        if(height + 0.01 > pos.y) {
          return distance(pos, camera);
        }
        // iterate forwards according to the height mismatch
        pos += dir * (pos.y - height);
      }
      // if hit was not registered, just assume hit the top layer,
      // this makes the raymarching faster and looks better at higher distances
      return distance(start, camera);
    }
    
    // Calculate normal at point by calculating the height at the pos and 2 additional points very close to pos
    vec3 normal(vec2 pos, float e, float depth) {
      vec2 ex = vec2(e, 0);
      float H = getwaves(pos.xy, ITERATIONS_NORMAL) * depth;
      vec3 a = vec3(pos.x, H, pos.y);
      return normalize(
        cross(
          a - vec3(pos.x - e, getwaves(pos.xy - ex.xy, ITERATIONS_NORMAL) * depth, pos.y),
          a - vec3(pos.x, getwaves(pos.xy + ex.yx, ITERATIONS_NORMAL) * depth, pos.y + e)
        )
      );
    }
    
    // Helper function that generates camera ray based on UV and mouse
    vec3 getRay() {
      vec2 uv = vec2(vUvs.x,1.-vUvs.y);
      uv *=2.;
      uv-=1.;
      return normalize(vec3(uv.x, uv.y, 1.5));
    }
    
    // Ray-Plane intersection checker
    float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normal) {
      return clamp(dot(point - origin, normal) / dot(direction, normal), -1.0, 9991999.0);
    }
    
    vec3 aces_tonemap(vec3 color) {
      mat3 m1 = mat3(
        0.59719, 0.07600, 0.02840,
        0.35458, 0.90834, 0.13383,
        0.04823, 0.01566, 0.83777
      );
      mat3 m2 = mat3(
        1.60475, -0.10208, -0.00327,
        -0.53108,  1.10813, -0.07276,
        -0.07367, -0.00605,  1.07602
      );
      vec3 v = m1 * color;
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));
    }
    
    // Main
    void main() {
      // get the ray
      vec3 ray = getRay();
    
      // now ray.y must be negative, water must be hit
      // define water planes
      vec3 waterPlaneHigh = vec3(0.0, 0.0, 0.0);
      vec3 waterPlaneLow = vec3(0.0, -WATER_DEPTH, 0.0);
    
      // define ray origin, moving around
      vec3 origin = vec3(iTime, CAMERA_HEIGHT, iTime);
    
      // calculate intersections and reconstruct positions
      float highPlaneHit = intersectPlane(origin, ray, waterPlaneHigh, vec3(0.0, 1.0, 0.0));
      float lowPlaneHit = intersectPlane(origin, ray, waterPlaneLow, vec3(0.0, 1.0, 0.0));
      vec3 highHitPos = origin + ray * highPlaneHit;
      vec3 lowHitPos = origin + ray * lowPlaneHit;
    
      // raymatch water and reconstruct the hit pos
      float dist = raymarchwater(origin, highHitPos, lowHitPos, WATER_DEPTH);
      vec3 waterHitPos = origin + ray * dist;
    
      // calculate normal at the hit position
      vec3 N = normal(waterHitPos.xz, 0.01, WATER_DEPTH);
    
      // smooth the normal with distance to avoid disturbing high frequency noise
      N = mix(N, vec3(0.0, 1.0, 0.0), 0.8 * min(1.0, sqrt(dist*0.01) * 1.1));
    
      // calculate fresnel coefficient
      float fresnel = (0.04 + (1.0-0.04)*(pow(1.0 - max(0.0, dot(-N, ray)), 5.0)));
    
      // reflect the ray and make sure it bounces up
      vec3 R = normalize(reflect(ray, N));
      R.y = abs(R.y);
    
      // calculate the reflection and approximate subsurface scattering
      vec3 scattering = vec3(0.0293, 0.0698, 0.1717) * (0.2 + (waterHitPos.y + WATER_DEPTH) / WATER_DEPTH);
    
      // return the combined result
      vec3 C = fresnel + (1.0 - fresnel) * scattering;
      gl_FragColor = vec4(aces_tonemap(C * 2.0), 1.0);
    }`;

    const water = Sprite.from(
      'https://media.istockphoto.com/id/118337676/uk/%D1%84%D0%BE%D1%82%D0%BE/%D0%B2%D0%BE%D0%B4%D0%BD%D0%B0-%D0%BF%D0%BE%D0%B2%D0%B5%D1%80%D1%85%D0%BD%D1%8F-%D0%B2-%D1%8F%D1%81%D0%BA%D1%80%D0%B0%D0%B2%D0%BE%D0%BC%D1%83-%D1%81%D0%B8%D0%BD%D1%8C%D0%BE%D0%BC%D1%83-%D0%BA%D0%BE%D0%BB%D1%8C%D0%BE%D1%80%D1%96.jpg?s=1024x1024&w=is&k=20&c=fHyUipQ1VrPI3fBcQUp9GKrKcs_-TCcU_dCKTY4i73g='
    );

    // this.addChild(water);
    let time = 0.0;

    const shader = Shader.from(vertexSrc, fragmentSrc);
    const quad = new Mesh(geometry, shader);

    quad.position.set(400, 300);
    quad.scale.set(10);

    this.addChild(quad);

    // start the animation..
    gsap.ticker.add(() => {
      time += 0.2;
      quad.shader.uniforms.iTime = time;
    });
  }
}
