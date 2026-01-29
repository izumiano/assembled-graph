attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;
attribute vec4 aVertexRelativeBarPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;
varying mediump vec4 vRelativeBarPositions;

void main(void) {
	gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
	vColor = aVertexColor;
	vRelativeBarPositions = aVertexRelativeBarPosition;
}