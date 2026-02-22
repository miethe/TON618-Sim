import { blackholeWGSL } from '../shaders/blackhole.wgsl';

export interface SimulationState {
  viewMode: number;
  wavelength: number;
  timeSpeed: number;
  showMilkyWay: boolean;
  showJets: boolean;
  cameraDistance: number;
  cameraAngleX: number;
  cameraAngleY: number;
}

export class BlackHoleRenderer {
  private canvas: HTMLCanvasElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private pipeline!: GPURenderPipeline;
  private uniformBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;
  private time: number = 0;
  private animationFrameId: number = 0;
  private destroyed: boolean = false;
  
  public state: SimulationState = {
    viewMode: 0,
    wavelength: 0,
    timeSpeed: 1.0,
    showMilkyWay: false,
    showJets: true,
    cameraDistance: 10.0,
    cameraAngleX: 0.2,
    cameraAngleY: 0.0,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported on this browser.');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    
    if (!adapter) {
      throw new Error('No appropriate GPUAdapter found.');
    }

    this.device = await adapter.requestDevice();
    if (this.destroyed) {
      this.device.destroy();
      return;
    }
    
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    const shaderModule = this.device.createShaderModule({
      label: 'Black Hole Shader',
      code: blackholeWGSL,
    });

    const compilationInfo = await shaderModule.getCompilationInfo();
    if (compilationInfo.messages.length > 0) {
      let hasError = false;
      let errorMsg = '';
      for (const msg of compilationInfo.messages) {
        if (msg.type === 'error') {
          hasError = true;
          errorMsg += msg.message + '\n';
        }
      }
      if (hasError) {
        throw new Error('Shader compilation failed:\n' + errorMsg);
      }
    }

    this.pipeline = this.device.createRenderPipeline({
      label: 'Black Hole Pipeline',
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: presentationFormat }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    // Uniforms struct size: 
    // res(8) + pad(8) + camPos(12) + pad(4) + camDir(12) + pad(4) + camUp(12) + pad(4) 
    // + time(4) + viewMode(4) + wavelength(4) + showMilkyWay(4) = 80 bytes
    this.uniformBuffer = this.device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    
    this.render();
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }

  private updateUniforms() {
    const uniforms = new Float32Array(24);
    
    // Resolution
    uniforms[0] = this.canvas.width;
    uniforms[1] = this.canvas.height;
    
    // Camera calculations
    const dist = this.state.cameraDistance;
    const cx = Math.cos(this.state.cameraAngleY) * Math.cos(this.state.cameraAngleX) * dist;
    const cy = Math.sin(this.state.cameraAngleX) * dist;
    const cz = Math.sin(this.state.cameraAngleY) * Math.cos(this.state.cameraAngleX) * dist;
    
    // Camera Pos (offset 4)
    uniforms[4] = cx;
    uniforms[5] = cy;
    uniforms[6] = cz;
    
    // Camera Dir (offset 8)
    const len = Math.sqrt(cx*cx + cy*cy + cz*cz);
    uniforms[8] = -cx/len;
    uniforms[9] = -cy/len;
    uniforms[10] = -cz/len;
    
    // Camera Up (offset 12)
    uniforms[12] = 0;
    uniforms[13] = 1;
    uniforms[14] = 0;
    
    // Scalars (offset 60 bytes = index 15)
    uniforms[15] = this.time;
    uniforms[16] = this.state.viewMode;
    uniforms[17] = this.state.wavelength;
    uniforms[18] = this.state.showMilkyWay ? 1.0 : 0.0;
    uniforms[19] = this.state.showJets ? 1.0 : 0.0;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms.buffer);
  }

  private render = () => {
    if (this.destroyed) return;
    
    this.time += 0.01 * this.state.timeSpeed;
    this.updateUniforms();

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.draw(6, 1, 0, 0);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
    this.animationFrameId = requestAnimationFrame(this.render);
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.resize.bind(this));
    this.device?.destroy();
  }
}
