precision mediump float;

uniform float uCornerRadius;

varying lowp vec4 vColor;
// x is relative width of bar (from 0 to 1), y is relative height of bar (from 0 to 1), z is pixel width, w is pixel height
varying vec4 vRelativeBarPositions;

bool isInsideBar(){
	// invert right half of bar so we can handle it the same way as left side
	vec2 relativePos = vec2(-abs(vRelativeBarPositions.x-0.5)+0.5, vRelativeBarPositions.y);

	vec2 dimensions = vec2(vRelativeBarPositions.z, vRelativeBarPositions.w);

	vec2 pixelPos = vec2(relativePos.x * dimensions.x, relativePos.y * dimensions.y);

	// if in one of the top corners within the corner radius
	if(pixelPos.y > dimensions.y - uCornerRadius && pixelPos.x < uCornerRadius){
		vec2 distVec = pixelPos - vec2(uCornerRadius, dimensions.y - uCornerRadius);
		float dist2 = distVec.x * distVec.x + distVec.y * distVec.y;

		return dist2 <= uCornerRadius * uCornerRadius;
	}
	
	return true;
}

void main(void) {
	if(!isInsideBar()){
		discard;
	}
	float intensity = vRelativeBarPositions.y * 0.5 + 0.5;
	gl_FragColor = vec4(vColor.r * intensity, vColor.g * intensity, vColor.b * intensity, vColor.a);
}