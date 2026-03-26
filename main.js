if (!navigator.gpu) throw new Error ('WebGPU not supported on this browser.');

const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

const adapter = await navigator.gpu.requestAdapter();
if(!adapter) throw new Error('No appropriate GPUAdapter found.');

const device = await adapter.requestDevice();

const encoder = device.createCommandEncoder();

context.configure({
    device,
    format: canvasFormat 
});
//1.- Primero que nada, crear TypedArray(son un grupo de objetos de JavaScript que te permiten asignar bloques contiguos de memoria y que interpretan cada elemento de la serie como un tipo de datos específico. Por ejemplo, en un objeto Uint8Array, cada elemento del array es un solo byte sin firma. Los TypedArrays son ideales para enviar y recibir datos con APIs sensibles al diseño de la memoria, como WebAssembly, WebAudio y (por supuesto) WebGPU). Para luego el diseño.
const vertices = new Float32Array([
  //   X,    Y,
    -0.8, -0.8, // Triangle 1 
     0.8, -0.8,
     0.8,  0.8,
  
    -0.8, -0.8, // Triangle 2 
     0.8,  0.8,
    -0.8,  0.8,
  ]); //Las GPU funcionan en términos de triángulos, por lo que se debe proporcionar los vértices en grupos de tres. 

//2.- Crear un búfer de vértices (Un búfer es un bloque de memoria al que la GPU puede acceder con facilidad y que se marca para determinados fines.)
  //La GPU no puede dibujar vértices con datos de un array de JavaScriptpor lo que cualquier dato que quieras que la GPU use mientras dibuja debe estar en esa memoria.
const vertexBuffer = device.createBuffer({
  label: "Cell vertices", //Asignación de un etiqueta para el búfer, la etiqueta es cualquier cadena que desees, siempre que te ayude a identificar el objeto. 
  size: vertices.byteLength, //Proporciona un tamaño para el búfer en bytes.
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, //Especificar el uso del búfer. GPUBufferUsage.VERTEX(el búfer se use para datos de vértices) y GPUBufferUsage.COPY_DST(copiar datos en él).
});

//3.- Diseño para dibujar:
  //copiar los datos de vértices en la memoria del búfer:
device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);
const vertexBufferLayout = {
  arrayStride: 8, //Es la cantidad de bytes que la GPU tiene que saltar hacia delante en el buffer cuando busca el siguiente vértice.
  attributes: [{
    format: "float32x2", //Proviene de una lista de tipos de formato GPUVertexFormat que describen cada tipo de datos de vértices que la GPU puede comprender. 
    offset: 0, // Describe cuántos bytes empiezan en el vértice de este atributo en particular.
    shaderLocation: 0, // Este es un número arbitrario entre 0 y 15 y debe ser único para cada atributo que defina. V
  }]/*Los atributos son datos individuales codificados en cada vértice. */, 
};
  //Ahora están los datos que a renderizar, pero se debe indicar a la GPU exactamente cómo procesarlos. En gran parte, eso sucede con los sombreadores.
const cellShaderModule = device.createShaderModule({
  label: "Cell shader",
  code: `
  @vertex
  fn vertexMain(@location(0) pos: vec2f) ->
    @builtin(position) vec4f {
    return vec4f(pos, 0, 1);
  }

  @fragment
  fn fragmentMain() -> @location(0) vec4f {
    return vec4f(1, 0, 0, 1);
  }
` //Código WGSL (WebGPU Shading Language) como una cadena que define el sombredor de vértices, esto se hace mediante una función y la GPU llama a esa función una vez por cada vértice de vertexBuffer. Funcionamiento de ambas funciones: https://codelabs.developers.google.com/your-first-webgpu-app?hl=es-419#3:~:text=En%20WGSL%2C%20se%20puede%20asignar%20el%20nombre%20que%20desees%20a%20una%20funci%C3%B3n%20de%20sombreador%20de%20v%C3%A9rtices%2C
});
  //Canalización de renderizaciones. La canalización de renderizaciones controla cómo se dibuja la geometría, incluidos elementos como los sombreadores, cómo interpretar los datos en los búferes de vértices, qué tipo de geometría debe renderizarse (líneas, puntos, triángulos, etc.) y mucho más.
const cellPipeline = device.createRenderPipeline({
  label: "Cell pipeline",
  layout: "auto", //describe los tipos de entrada (aparte de los búferes de vértices) que necesita la canalización, pero en realidad no tiene ninguno. 
  vertex: {
    module: cellShaderModule,
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout]
  }, // El module es el GPUShaderModule que contiene tu sombreador de vértices y entryPoint asigna el nombre de la función en el código del sombreador que se llama para cada invocación del vértice. (Puedes tener varias funciones @vertex y @fragment en un único módulo de sombreador).
  fragment: {
    module: cellShaderModule,
    entryPoint: "fragmentMain",
    targets: [{
      format: canvasFormat
    }]
  } //Esto también incluye un módulo del sombreador y entryPoint, como en la etapa de vértice. El último bit es definir los targets con el que se usa esta canalización. Este es un array de diccionarios que proporcionan detalles, como el format de textura, de los adjuntos de color a los que genera la canalización. Estos detalles deben coincidir con las texturas que se proporcionan en los colorAttachments de cualquier pase de renderización con el que se use esta canalización. 
});


//
const pass = encoder.beginRenderPass({
    colorAttachments: [{
       view: context.getCurrentTexture().createView(), 
       loadOp: "clear", 
       clearValue: { r: 0, g: 0, b: 0.4, a: 1 }, 
       storeOp: "store", 
    }]
  });
//4.- Dibujar el cuadrado:
pass.setPipeline(cellPipeline); // indica con qué canalización se debe dibujar. 
pass.setVertexBuffer(0, vertexBuffer); // con el búfer que contiene los vértices del cuadrado. Lo llamarás con 0 porque este búfer corresponde al elemento 0 en la definición vertex.buffers de la canalización actual.
pass.draw(vertices.length / 2); // Dibujar con el argumento que significa la cantidad de vértices que se deben renderizar, los cuales se extraen de los búferes de vértices configurados actualmente y se interpretan con la canalización configurada en ese momento. 

pass.end(); 
const commandBuffer = encoder.finish(); 

//
device.queue.submit([commandBuffer]); 


