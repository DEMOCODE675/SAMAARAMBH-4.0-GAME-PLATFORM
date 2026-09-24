export const normalizePoint = (x, y, canvasWidth, canvasHeight) => {
  return {
    x: x / canvasWidth,
    y: y / canvasHeight
  };
};

export const denormalizePoint = (nx, ny, canvasWidth, canvasHeight) => {
  return {
    x: nx * canvasWidth,
    y: ny * canvasHeight
  };
};

export const drawStroke = (ctx, stroke, canvasWidth, canvasHeight) => {
  if (!stroke.points || stroke.points.length === 0) return;
  
  ctx.beginPath();
  ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
  ctx.lineWidth = stroke.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const start = denormalizePoint(stroke.points[0].x, stroke.points[0].y, canvasWidth, canvasHeight);
  ctx.moveTo(start.x, start.y);

  for (let i = 1; i < stroke.points.length; i++) {
    const point = denormalizePoint(stroke.points[i].x, stroke.points[i].y, canvasWidth, canvasHeight);
    ctx.lineTo(point.x, point.y);
  }
  
  ctx.stroke();
};

export const replayAllStrokes = (ctx, strokes, canvasWidth, canvasHeight) => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  strokes.sort((a, b) => a.strokeIndex - b.strokeIndex).forEach(stroke => {
    drawStroke(ctx, stroke, canvasWidth, canvasHeight);
  });
};
