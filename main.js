const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

//Adapter
const adapter = await navigator.gpu.requestAdapter();
//Device
const device = await adapter.requestDevice();

//Commands:
const encoder = device.createCommandEncoder();

context.configure({
    device,
    format: canvasFormat 
});

//
const pass = encoder.beginRenderPass({
    colorAttachments: [{
       view: context.getCurrentTexture().createView(), //La textura se proporciona, que le indica en qué partes de la textura debe renderizarse. Y el último método, indica que quieres que el pase de renderización use toda la textura.
       loadOp: "clear", // indica que se borre la textura cuando empieza el pase de renderización.
       clearValue: { r: 0, g: 0, b: 0.4, a: 1 }, //Color a renderizar.
       storeOp: "store", //indica que, una vez que finalice el pase de renderización, se guardarán los resultados de cualquier dibujo durante el pase de renderización en la textura.
    }]
  });
pass.end() //el simple hecho de realizar estas llamadas no implica que la GPU realice ninguna acción. Solo graban comandos para que la GPU los ejecute más tarde.
const commandBuffer = encoder.finish(); //El búfer de comandos es un controlador opaco para los comandos grabados.

//
device.queue.submit([commandBuffer]); //Envíar el Buffer de comandos a la GPU. 
device.queue.submit([encoder.finish()]); // Termina el búfer de comandos y se envía inmediatamente.

if (!navigator.gpu) throw new Error ('WebGPU not supported on this browser.');

if(!adapter) throw new Error('No appropriate GPUAdapter found.');
