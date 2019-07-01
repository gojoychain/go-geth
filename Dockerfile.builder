# Builds geth and all tools
# Specify build-arg VERSION for the compressed filename
FROM golang:1.11-alpine

RUN apk add --no-cache make gcc musl-dev linux-headers

WORKDIR /go-ethereum

ADD . /go-ethereum
RUN make all

ARG VERSION

RUN cd build/bin && \
    tar -zcvf "../geth-all-linux-amd64-$VERSION.tar.gz" . && \
    tar -zcvf "../geth-linux-amd64-$VERSION.tar.gz" geth
