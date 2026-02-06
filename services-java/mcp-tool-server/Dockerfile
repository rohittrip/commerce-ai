FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy parent pom and shared-lib first
COPY pom.xml .
COPY shared-lib/pom.xml shared-lib/
COPY shared-lib/src shared-lib/src

# Copy mcp-tool-server
COPY mcp-tool-server/pom.xml mcp-tool-server/
COPY mcp-tool-server/src mcp-tool-server/src

# Build
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/mcp-tool-server/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
