#version 410 core

in vec3 fNormal;
in vec4 fPosEye;
in vec2 fTexCoords;
in vec4 fragPosLightSpace;

out vec4 fColor;

in vec3 fragPos;

uniform	mat3 normalMatrix;
uniform mat3 lightDirMatrix;
//lighting
uniform	vec3 lightDir;
uniform	vec3 lightColor;

uniform vec3 lightPos1;
uniform vec3 lightPos2;

uniform mat4 view;

//texture
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

vec3 ambient;
float ambientStrength = 0.2f;
vec3 diffuse;
vec3 specular;
float specularStrength = 0.5f;
float shininess = 32.0f;

float constant = 1.0f;
float linear = 0.00225f;
float quadratic = 0.00375;

float ambientPoint = 0.5f;
float specularStrengthPoint = 0.5f;
float shininessPoint = 32.0f;

uniform int spotinit;

float spotQuadratic = 0.02f;
float spotLinear = 0.09f;
float spotConstant = 1.0f;

vec3 spotLightAmbient = vec3(0.0f, 0.0f, 0.0f);
vec3 spotLightSpecular = vec3(1.0f, 1.0f, 1.0f);
vec3 spotLightColor = vec3(12,12,12);

uniform float spotlight1;
uniform float spotlight2;

uniform vec3 spotLightDirection;
uniform vec3 spotLightPosition;

float computeFog()
{
 float fogDensity = 0.08f;
 float fragmentDistance = length(fPosEye);
 float fogFactor = exp(-pow(fragmentDistance * fogDensity, 2));

 return clamp(fogFactor, 0.0f, 1.0f);
}

float computeShadow()
{

	//perform perspective divide
	vec3 normalizedCoords= fragPosLightSpace.xyz / fragPosLightSpace.w;

	//tranform from [-1,1] range to [0,1] range
	normalizedCoords = normalizedCoords * 0.5 + 0.5;

	//get closest depth value from lights perspective
	float closestDepth = texture(shadowMap, normalizedCoords.xy).r;

	//get depth of current fragment from lights perspective
	float currentDepth = normalizedCoords.z;

	//if the current fragments depth is greater than the value in the depth map, the current fragment is in shadow 
	//else it is illuminated
	//float shadow = currentDepth > closestDepth ? 1.0 : 0.0;
	float bias = 0.005f;
	float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;
	if (normalizedCoords.z > 1.0f)
		return 0.0f;
	return shadow;
	
	


}
vec3 computePointLight(vec4 lightPosEye)
{
	vec3 cameraPosEye = vec3(0.0f);
	vec3 normalEye = normalize(normalMatrix * fNormal);
	vec3 lightDirN = normalize(lightPosEye.xyz - fPosEye.xyz);
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);
	vec3 halfVector = normalize(lightDirN + viewDirN);
	vec3 reflection = reflect(-lightDirN, normalEye);
	float specCoeff = pow(max(dot(normalEye, reflection), 0.0f), shininessPoint);
	float distance = length(lightPosEye.xyz - fPosEye.xyz);
	float att = 1.0f / (constant + linear * distance + quadratic * (distance * distance));
	vec3 ambient = att * ambientPoint * lightColor;
	vec3 diffuse = att * max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	vec3 specular = att * specularStrengthPoint * specCoeff * lightColor;

	return (ambient + diffuse + specular);
}
vec3 computeLightSpotComponents() {
	vec3 cameraPosEye = vec3(0.0f);
	vec3 lightDir = normalize(spotLightPosition - fragPos);
	vec3 normalEye = normalize(normalMatrix * fNormal);
	vec3 lightDirN = normalize(lightDirMatrix * lightDir);
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);
	vec3 halfVector = normalize(lightDirN + viewDirN);

	float diff = max(dot(fNormal, lightDir), 0.0f);
	float spec = pow(max(dot(normalEye, halfVector), 0.0f), shininess);
	float distance = length(spotLightPosition - fragPos);
	float attenuation = 1.0f / (spotConstant + spotLinear * distance + spotQuadratic * distance * distance);

	float theta = dot(lightDir, normalize(-spotLightDirection));
	float epsilon = spotlight1 - spotlight2;
	float intensity = clamp((theta - spotlight2)/epsilon, 0.0, 1.0);

	vec3 ambient = spotLightColor * spotLightAmbient * vec3(texture(diffuseTexture, fTexCoords));
	vec3 diffuse = spotLightColor * spotLightSpecular * diff * vec3(texture(diffuseTexture, fTexCoords));
	vec3 specular = spotLightColor * spotLightSpecular * spec * vec3(texture(specularTexture, fTexCoords));
	ambient *= attenuation * intensity;
	diffuse *= attenuation * intensity;
	specular *= attenuation * intensity;
	
	return ambient + diffuse + specular;
}

vec3 computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);//in eye coordinates, the viewer is situated at the origin
	
	//transform normal
	vec3 normalEye = normalize(fNormal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightDir);
	
	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);
		
	//compute ambient light
	ambient = ambientStrength * lightColor;
	
	//compute diffuse light
	diffuse = max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	
	//compute specular light
	vec3 reflection = reflect(-lightDirN, normalEye);
	float specCoeff = pow(max(dot(viewDirN, reflection), 0.0f), shininess);
	specular = specularStrength * specCoeff * lightColor;

	return (ambient+diffuse+specular);

}



void main() 
{
	vec3 light = computeLightComponents();
	float shadow = computeShadow();
	//vec3 light = vec3(0.0f,0.0f,0.0f);

	//point lights
	
	
	//vec4 lightPosEye2 =  view * vec4(lightPos2, 1.0f);
	//light += computePointLight(lightPosEye2);

	vec3 baseColor = vec3(0.9f, 0.35f, 0.0f);//orange
	
	ambient *= vec3(texture(diffuseTexture, fTexCoords));
	diffuse *= vec3(texture(diffuseTexture, fTexCoords));
	specular *= vec3(texture(specularTexture, fTexCoords));

	vec4 lightPosEye1 = view * vec4(lightPos1, 1.0f);
	light += computePointLight(lightPosEye1);

	vec3 color = min((ambient + (1.0f - shadow) * diffuse) + (1.0f - shadow) * specular, 1.0f);

	

	//fColor = vec4(color, 1.0f);

	vec4 diffuseColor = texture(diffuseTexture, fTexCoords);
	if (spotinit == 1){
	light += computeLightSpotComponents();
	}
	vec4 colorWithShadow = vec4(color,1.0f);
	float fogFactor = computeFog();
	vec4 fogColor = vec4(0.5f, 0.5f, 0.5f, 1.0f);
	fColor = mix(fogColor, colorWithShadow * vec4(light, 1.0f), fogFactor);

	//fColor = min(colorWithShadow * vec4(light, 1.0f), 1.0f);

	
}
