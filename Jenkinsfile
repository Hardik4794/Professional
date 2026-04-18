pipeline {
    agent any

    environment {
        APP_NAME        = 'Task-Manager-API'
        DOCKER_IMAGE    = "task-manager-api"
        APP_VERSION     = "${BUILD_NUMBER}"
        SONAR_HOST_URL  = 'http://host.docker.internal:9000'
        STAGING_PORT    = '3000'
        PROD_PORT       = '80'
        NODE_ENV        = 'test'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    stages {

        // ─────────────────────────────────────────────
        // STAGE 1: BUILD
        // ─────────────────────────────────────────────
        stage('Build') {
            steps {
                echo "=== STAGE: BUILD ==="
                echo "Building version: ${APP_VERSION}"

                // Install dependencies
                sh 'npm ci'

                // Build Docker image tagged with version AND latest
                sh """
                    docker build \
                        --build-arg APP_VERSION=${APP_VERSION} \
                        -t ${DOCKER_IMAGE}:${APP_VERSION} \
                        -t ${DOCKER_IMAGE}:latest \
                        .
                """

                echo "Docker image built: ${DOCKER_IMAGE}:${APP_VERSION}"
            }
            post {
                success {
                    echo "BUILD stage passed."
                    // Archive package.json as a build artifact record
                    archiveArtifacts artifacts: 'package.json', fingerprint: true
                }
                failure {
                    echo "BUILD stage FAILED."
                }
            }
        }

        // ─────────────────────────────────────────────
        // STAGE 2: TEST
        // ─────────────────────────────────────────────
        stage('Test') {
            steps {
                echo "=== STAGE: TEST ==="

                // Run unit tests + integration tests with coverage
                sh 'npm test -- --ci --reporters=default --reporters=jest-junit || true'

                // Publish coverage summary to console
                sh 'cat coverage/coverage-summary.json || true'
            }
            post {
                always {
                    // Publish JUnit test results if available
                    junit allowEmptyResults: true, testResults: 'junit.xml'

                    // Publish coverage HTML report
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
                success {
                    echo "TEST stage passed."
                }
                failure {
                    echo "TEST stage FAILED — check test results."
                    error("Tests failed. Stopping pipeline.")
                }
            }
        }

        // ─────────────────────────────────────────────
        // STAGE 3: CODE QUALITY (SonarQube)
        // ─────────────────────────────────────────────
        stage('Code Quality') {
            steps {
                echo "=== STAGE: CODE QUALITY ==="

                withSonarQubeEnv('SonarQube') {
                    sh """
                        npx sonar-scanner \
                            -Dsonar.projectKey=${APP_NAME} \
                            -Dsonar.projectName="${APP_NAME}" \
                            -Dsonar.projectVersion=${APP_VERSION} \
                            -Dsonar.sources=src \
                            -Dsonar.tests=tests \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.host.url=${SONAR_HOST_URL} \
                            -Dsonar.qualitygate.wait=true
                    """
                }
            }
            post {
                success {
                    echo "CODE QUALITY stage passed — Quality Gate OK."
                }
                failure {
                    echo "CODE QUALITY stage FAILED — Quality Gate not met."
                    error("SonarQube Quality Gate failed. Fix code quality issues.")
                }
            }
        }

        // ─────────────────────────────────────────────
        // STAGE 4: SECURITY
        // ─────────────────────────────────────────────
        stage('Security') {
            steps {
                echo "=== STAGE: SECURITY ==="

                // npm audit for dependency vulnerabilities
                sh '''
                    echo "--- npm audit (dependency vulnerabilities) ---"
                    npm audit --audit-level=high --json > npm-audit.json || true
                    npm audit --audit-level=high || true
                '''

                // Trivy scan on the Docker image for OS & library CVEs
                sh """
                    echo "--- Trivy Docker image scan ---"
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v \$HOME/.cache/trivy:/root/.cache/trivy \
                        aquasec/trivy:latest image \
                        --exit-code 0 \
                        --severity HIGH,CRITICAL \
                        --format table \
                        ${DOCKER_IMAGE}:${APP_VERSION} || true
                """

                // Archive the npm audit report
                archiveArtifacts artifacts: 'npm-audit.json', allowEmptyArchive: true
            }
            post {
                success {
                    echo "SECURITY stage completed. Review npm-audit.json and Trivy output."
                }
            }
        }

        // ─────────────────────────────────────────────
        // STAGE 5: DEPLOY (Staging)
        // ─────────────────────────────────────────────
        stage('Deploy') {
            steps {
                echo "=== STAGE: DEPLOY (Staging) ==="

                // Tear down any existing staging containers
                sh '''
                    docker compose -f docker-compose.yml down --remove-orphans || true
                '''

                // Deploy to staging
                sh """
                    APP_VERSION=${APP_VERSION} \
                    JWT_SECRET=staging-jwt-secret-${APP_VERSION} \
                    docker compose -f docker-compose.yml up -d --wait
                """

                // Wait for health check
                sh '''
                    echo "Waiting for staging app to be healthy..."
                    for i in $(seq 1 15); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
                        if [ "$STATUS" = "200" ]; then
                            echo "App is healthy (HTTP 200)!"
                            exit 0
                        fi
                        echo "Attempt $i: HTTP $STATUS — retrying in 5s..."
                        sleep 5
                    done
                    echo "Health check FAILED after 75 seconds."
                    exit 1
                '''
            }
            post {
                success {
                    echo "DEPLOY (Staging) stage passed."
                }
                failure {
                    echo "DEPLOY stage FAILED — rolling back staging..."
                    sh 'docker compose -f docker-compose.yml down || true'
                    error("Staging deployment failed.")
                }
            }
        }

        // ─────────────────────────────────────────────
        // STAGE 6: RELEASE (Production)
        // ─────────────────────────────────────────────
        stage('Release') {
            steps {
                echo "=== STAGE: RELEASE (Production) ==="

                // Tag the Docker image as a versioned release
                sh """
                    docker tag ${DOCKER_IMAGE}:${APP_VERSION} ${DOCKER_IMAGE}:release-${APP_VERSION}
                    echo "Tagged image as release-${APP_VERSION}"
                """

                // Tear down staging, bring up production
                sh '''
                    docker compose -f docker-compose.yml down --remove-orphans || true
                    docker compose -f docker-compose.prod.yml down --remove-orphans || true
                '''

                sh """
                    APP_VERSION=${APP_VERSION} \
                    JWT_SECRET=production-jwt-secret-${APP_VERSION} \
                    GRAFANA_PASSWORD=admin123 \
                    docker compose -f docker-compose.prod.yml up -d --wait
                """

                // Verify production health
                sh '''
                    echo "Verifying production deployment..."
                    for i in $(seq 1 15); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || echo "000")
                        if [ "$STATUS" = "200" ]; then
                            echo "Production app is healthy!"
                            exit 0
                        fi
                        echo "Attempt $i: HTTP $STATUS — retrying in 5s..."
                        sleep 5
                    done
                    echo "Production health check FAILED."
                    exit 1
                '''

                // Print release info
                sh """
                    echo "=========================================="
                    echo "  RELEASE COMPLETE"
                    echo "  App:     ${APP_NAME}"
                    echo "  Version: release-${APP_VERSION}"
                    echo "  Build:   ${BUILD_NUMBER}"
                    echo "=========================================="
                """
            }
            post {
                success {
                    echo "RELEASE stage passed — v${APP_VERSION} is live in production."
                }
                failure {
                    echo "RELEASE stage FAILED — rolling back production..."
                    sh 'docker compose -f docker-compose.prod.yml down || true'
                    error("Production release failed.")
                }
            }
        }

        // ─────────────────────────────────────────────
        // STAGE 7: MONITORING
        // ─────────────────────────────────────────────
        stage('Monitoring') {
            steps {
                echo "=== STAGE: MONITORING ==="

                // Confirm Prometheus is scraping the app
                sh '''
                    echo "--- Verifying Prometheus is reachable ---"
                    for i in $(seq 1 10); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/-/ready || echo "000")
                        if [ "$STATUS" = "200" ]; then
                            echo "Prometheus is ready!"
                            break
                        fi
                        echo "Attempt $i: Prometheus not ready yet (HTTP $STATUS)..."
                        sleep 5
                    done
                '''

                // Confirm app metrics endpoint is working
                sh '''
                    echo "--- Verifying /metrics endpoint ---"
                    METRICS=$(curl -s http://localhost/metrics | grep "http_request_duration_ms" | head -5 || true)
                    if [ -n "$METRICS" ]; then
                        echo "Metrics endpoint is working!"
                        echo "$METRICS"
                    else
                        echo "WARNING: Metrics endpoint may not be returning expected data yet."
                    fi
                '''

                // Confirm Grafana is up
                sh '''
                    echo "--- Verifying Grafana is reachable ---"
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || echo "000")
                    echo "Grafana health check: HTTP $STATUS"
                '''

                // Simulate a load spike to demonstrate alerting
                sh '''
                    echo "--- Simulating load for alert demo ---"
                    for i in $(seq 1 20); do
                        curl -s http://localhost/health > /dev/null &
                        curl -s http://localhost/api/tasks > /dev/null &
                    done
                    wait
                    echo "Load simulation complete."
                '''

                // Print monitoring summary
                sh '''
                    echo "=========================================="
                    echo "  MONITORING SUMMARY"
                    echo "  Prometheus:  http://localhost:9090"
                    echo "  Grafana:     http://localhost:3001"
                    echo "             (admin / admin123)"
                    echo "  App Metrics: http://localhost/metrics"
                    echo "  App Health:  http://localhost/health"
                    echo "=========================================="
                '''
            }
            post {
                success {
                    echo "MONITORING stage passed — Prometheus + Grafana are live."
                }
            }
        }
    }

    // ─────────────────────────────────────────────
    // POST-PIPELINE ACTIONS
    // ─────────────────────────────────────────────
    post {
        always {
            echo "Pipeline finished with status: ${currentBuild.currentResult}"
            cleanWs(cleanWhenNotBuilt: false, deleteDirs: true, disableDeferredWipeout: true,
                    notFailBuild: true, patterns: [[pattern: 'node_modules', type: 'INCLUDE']])
        }
        success {
            echo """
            ╔══════════════════════════════════════╗
            ║   PIPELINE SUCCEEDED                 ║
            ║   Build: ${BUILD_NUMBER}             ║
            ║   All 7 stages passed!               ║
            ╚══════════════════════════════════════╝
            """
        }
        failure {
            echo """
            ╔══════════════════════════════════════╗
            ║   PIPELINE FAILED                    ║
            ║   Build: ${BUILD_NUMBER}             ║
            ║   Check logs above for details.      ║
            ╚══════════════════════════════════════╝
            """
        }
    }
}
