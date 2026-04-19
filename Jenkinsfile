pipeline {
    agent any

    environment {
        APP_NAME        = 'Task-Manager-API'
        DOCKER_IMAGE    = "task-manager-api"
        APP_VERSION     = "${BUILD_NUMBER}"
        SONAR_HOST_URL  = 'http://host.docker.internal:9000'
        NODE_ENV        = 'test'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo "=== BUILD ==="
                sh 'npm ci'

                sh """
                    docker build \
                        --build-arg APP_VERSION=${APP_VERSION} \
                        -t ${DOCKER_IMAGE}:${APP_VERSION} \
                        -t ${DOCKER_IMAGE}:latest .
                """
            }
        }

        stage('Test') {
            steps {
                echo "=== TEST ==="

                sh 'docker network create test-network || true'
                sh 'docker rm -f mongo-test || true'

                sh '''
                    docker run -d \
                        --name mongo-test \
                        --network test-network \
                        mongo:7.0
                '''

                sh 'sleep 10'

                // ❗ STRICT TESTING (FAILS PIPELINE)
                sh '''
                    docker run --rm \
                        --network test-network \
                        -v $(pwd):/app \
                        -w /app \
                        -e MONGO_URI=mongodb://mongo-test:27017/testdb \
                        -e NODE_ENV=test \
                        -e JWT_SECRET=test-secret \
                        node:18 \
                        sh -c "npm install --silent && npx jest --ci --runInBand --detectOpenHandles"
                '''
            }

            post {
                always {
                    sh 'docker rm -f mongo-test || true'
                    sh 'docker network rm test-network || true'
                }
            }
        }

        stage('Code Quality') {
            steps {
                echo "=== CODE QUALITY ==="

                sh """
                    docker run --rm \
                        --network host \
                        -v \$(pwd):/usr/src \
                        sonarsource/sonar-scanner-cli:latest \
                        -Dsonar.projectKey=${APP_NAME} \
                        -Dsonar.projectName=${APP_NAME} \
                        -Dsonar.projectVersion=${APP_VERSION} \
                        -Dsonar.sources=src \
                        -Dsonar.tests=tests \
                        -Dsonar.host.url=${SONAR_HOST_URL} \
                        -Dsonar.qualitygate.wait=true \
                        -Dsonar.login=\$(cat /var/jenkins_home/sonar-token.txt)
                """
            }
        }

        stage('Security') {
            steps {
                echo "=== SECURITY ==="

                // ❗ FAIL if vulnerabilities found
                sh 'npm audit --audit-level=high'

                sh """
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --exit-code 1 \
                        --severity HIGH,CRITICAL \
                        ${DOCKER_IMAGE}:${APP_VERSION}
                """
            }
        }

        stage('Deploy (Staging)') {
            steps {
                echo "=== DEPLOY STAGING ==="

                sh 'docker rm -f task-manager-staging mongo-staging || true'
                sh 'docker network rm staging-network || true'
                sh 'docker network create staging-network'

                sh 'docker run -d --name mongo-staging --network staging-network mongo:7.0'
                sh 'sleep 8'

                sh """
                    docker run -d \
                        --name task-manager-staging \
                        --network staging-network \
                        -p 3000:3000 \
                        -e NODE_ENV=staging \
                        -e JWT_SECRET=staging-secret \
                        -e MONGO_URI=mongodb://mongo-staging:27017/taskmanager_staging \
                        ${DOCKER_IMAGE}:${APP_VERSION}
                """

                // ❗ STRICT HEALTH CHECK
                sh '''
                    for i in $(seq 1 10); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
                        if [ "$STATUS" = "200" ]; then exit 0; fi
                        sleep 3
                    done
                    echo "Staging failed!"
                    exit 1
                '''
            }
        }

        stage('Release (Production)') {
            steps {
                echo "=== RELEASE ==="

                sh "docker tag ${DOCKER_IMAGE}:${APP_VERSION} ${DOCKER_IMAGE}:release-${APP_VERSION}"

                sh 'docker rm -f task-manager-prod mongo-prod || true'
                sh 'docker network rm prod-network || true'
                sh 'docker network create prod-network'

                sh 'docker run -d --name mongo-prod --network prod-network mongo:7.0'
                sh 'sleep 8'

                sh """
                    docker run -d \
                        --name task-manager-prod \
                        --network prod-network \
                        -p 80:3000 \
                        -e NODE_ENV=production \
                        -e JWT_SECRET=production-secret \
                        -e MONGO_URI=mongodb://mongo-prod:27017/taskmanager_production \
                        ${DOCKER_IMAGE}:release-${APP_VERSION}
                """

                // ❗ STRICT PRODUCTION CHECK
                sh '''
                    for i in $(seq 1 10); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
                        if [ "$STATUS" = "200" ]; then exit 0; fi
                        sleep 3
                    done
                    echo "Production failed!"
                    exit 1
                '''
            }
        }

        stage('Monitoring') {
            steps {
                echo "=== MONITORING ==="

                sh 'docker rm -f prometheus grafana || true'

                sh '''
                    docker run -d \
                        --name prometheus \
                        --network prod-network \
                        -p 9090:9090 \
                        prom/prometheus
                '''

                sh '''
                    docker run -d \
                        --name grafana \
                        --network prod-network \
                        -p 3001:3000 \
                        grafana/grafana
                '''

                sh 'sleep 10'

                // ❗ BASIC ALERT SIMULATION
                sh '''
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
                    if [ "$STATUS" != "200" ]; then
                        echo "ALERT: Application is DOWN!"
                        exit 1
                    fi
                '''

                echo "Monitoring active"
            }
        }
    }

    post {
        success {
            echo "PIPELINE SUCCESS - TOP HD LEVEL"
        }
        failure {
            echo "PIPELINE FAILED - FIX REQUIRED"
        }
        always {
            cleanWs()
        }
    }
}
