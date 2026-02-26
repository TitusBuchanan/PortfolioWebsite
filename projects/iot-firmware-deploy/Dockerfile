FROM ubuntu:22.04 AS firmware-builder

LABEL maintainer="iot-team@example.com"
LABEL description="Firmware build environment for IoT devices"
LABEL version="1.0.0"

ENV DEBIAN_FRONTEND=noninteractive
ENV FIRMWARE_WORKSPACE=/workspace
ENV BUILD_OUTPUT=/output
ENV PATH="/opt/toolchain/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc-arm-none-eabi \
    binutils-arm-none-eabi \
    libnewlib-arm-none-eabi \
    cmake \
    ninja-build \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    jq \
    zip \
    unzip \
    ca-certificates \
    openssl \
    libssl-dev \
    libusb-1.0-0-dev \
    xxd \
    cppcheck \
    clang-format \
    doxygen \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
    esptool \
    platformio \
    pyserial \
    intelhex \
    cryptography

RUN useradd -m -s /bin/bash -u 1000 builder \
    && mkdir -p ${FIRMWARE_WORKSPACE} ${BUILD_OUTPUT} \
    && chown -R builder:builder ${FIRMWARE_WORKSPACE} ${BUILD_OUTPUT}

COPY scripts/ /opt/scripts/
RUN chmod +x /opt/scripts/*.sh

USER builder
WORKDIR ${FIRMWARE_WORKSPACE}

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD test -d ${FIRMWARE_WORKSPACE} && test -d ${BUILD_OUTPUT} || exit 1

ENTRYPOINT ["/opt/scripts/build-firmware.sh"]
CMD ["--help"]
