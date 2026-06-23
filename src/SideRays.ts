import { Renderer, Program, Triangle, Mesh } from 'ogl';

const hexToRgb = (hex: string) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const originToFlip = (origin: string) => {
    switch (origin) {
        case 'top-left': return [1, 0];
        case 'bottom-right': return [0, 1];
        case 'bottom-left': return [1, 1];
        default: return [0, 0];
    }
};

export interface SideRaysConfig {
    speed?: number;
    rayColor1?: string;
    rayColor2?: string;
    intensity?: number;
    spread?: number;
    origin?: string;
    tilt?: number;
    saturation?: number;
    blend?: number;
    falloff?: number;
    opacity?: number;
}

export class SideRays {
    container: HTMLElement;
    renderer: any;
    gl: any;
    animationId: number | null = null;
    uniforms: any;
    mesh: any;
    
    constructor(container: HTMLElement, config: SideRaysConfig = {}) {
        this.container = container;
        
        const {
            speed = 2.5,
            rayColor1 = '#EAB308',
            rayColor2 = '#96c8ff',
            intensity = 2,
            spread = 2,
            origin = 'top-right',
            tilt = 0,
            saturation = 1.5,
            blend = 0.75,
            falloff = 1.6,
            opacity = 1.0,
        } = config;

        this.renderer = new Renderer({
            dpr: Math.min(window.devicePixelRatio, 2),
            alpha: true
        });

        this.gl = this.renderer.gl;
        this.gl.canvas.style.width = '100%';
        this.gl.canvas.style.height = '100%';
        this.gl.canvas.style.position = 'absolute';
        this.gl.canvas.style.top = '0';
        this.gl.canvas.style.left = '0';
        this.gl.canvas.style.pointerEvents = 'none';
        this.gl.canvas.style.zIndex = '0'; // Behind the network canvas

        this.container.appendChild(this.gl.canvas);

        const vert = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }`;

        const frag = `precision highp float;
        uniform float iTime;
        uniform vec2 iResolution;
        uniform float iSpeed;
        uniform vec3 iRayColor1;
        uniform vec3 iRayColor2;
        uniform float iIntensity;
        uniform float iSpread;
        uniform float iFlipX;
        uniform float iFlipY;
        uniform float iTilt;
        uniform float iSaturation;
        uniform float iBlend;
        uniform float iFalloff;
        uniform float iOpacity;

        float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
          vec2 sourceToCoord = coord - raySource;
          float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
          return clamp(
            (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
            (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
            0.0, 1.0) *
            clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
          if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

          vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
          vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

          float tiltRad = iTilt * 3.14159265 / 180.0;
          float cs = cos(tiltRad);
          float sn = sin(tiltRad);
          vec2 rel = coord - rayPos;
          vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

          float halfSpread = iSpread * 0.275;
          vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
          vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

          vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
          vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

          vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

          float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
          float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
          color.rgb *= brightness;

          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(vec3(gray), color.rgb, iSaturation);

          color.a = max(color.r, max(color.g, color.b)) * iOpacity;
          gl_FragColor = color;
        }`;

        const [flipX, flipY] = originToFlip(origin);
        this.uniforms = {
            iTime: { value: 0 },
            iResolution: { value: [1, 1] },
            iSpeed: { value: speed },
            iRayColor1: { value: hexToRgb(rayColor1) },
            iRayColor2: { value: hexToRgb(rayColor2) },
            iIntensity: { value: intensity },
            iSpread: { value: spread },
            iFlipX: { value: flipX },
            iFlipY: { value: flipY },
            iTilt: { value: tilt },
            iSaturation: { value: saturation },
            iBlend: { value: blend },
            iFalloff: { value: falloff },
            iOpacity: { value: opacity }
        };

        const geometry = new Triangle(this.gl);
        const program = new Program(this.gl, { vertex: vert, fragment: frag, uniforms: this.uniforms });
        this.mesh = new Mesh(this.gl, { geometry, program });

        this.updateSize();
        window.addEventListener('resize', () => this.updateSize());

        this.loop(0);
    }

    updateSize() {
        this.renderer.dpr = Math.min(window.devicePixelRatio, 2);
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.renderer.setSize(w, h);
        this.uniforms.iResolution.value = [w * this.renderer.dpr, h * this.renderer.dpr];
    }

    loop = (t: number) => {
        this.uniforms.iTime.value = t * 0.001;
        try {
            this.renderer.render({ scene: this.mesh });
            this.animationId = requestAnimationFrame(this.loop);
        } catch (e) {
            console.error(e);
        }
    }
}
