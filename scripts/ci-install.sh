#!/bin/sh
# Run scripts/ci-install.sh with bun, osv-scanner or trivy.
set -eu

BUN_VERSION=1.4.2
# The baseline x64 build runs on CPUs without AVX2
BUN_SHA256_amd64=c678040f14fe0440eb839d37cbd0ce4c051a32da72806ac97de6a6aab6bf728f
BUN_SHA256_arm64=54328bbc2d9c8e0c9f892c544d66c57a83b84139e34909e5ee81758f1ac8fda7

OSV_VERSION=2.7.0
OSV_SHA256_amd64=160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b
OSV_SHA256_arm64=4061ef4c021ed3c47f203b818f337e351336cc5cd67c0274fc36bd1dfc728dd7

TRIVY_VERSION=0.75.0
TRIVY_SHA256_amd64=c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f
TRIVY_SHA256_arm64=a1ee9f6ffb7d112b64ff726a2a0717c21175c1114361391f4a132956751a13b3

case "$(uname -m)" in
	x86_64) arch=amd64 ;;
	aarch64) arch=arm64 ;;
	*) echo "unsupported arch $(uname -m)" >&2; exit 1 ;;
esac

fetch() { # url sha256 dest
	curl -fsSL "$1" -o "$3"
	echo "$2  $3" | sha256sum -c -
}

case "$1" in
	bun)
		if [ "$arch" = amd64 ]; then asset=bun-linux-x64-baseline; sum=$BUN_SHA256_amd64
		else asset=bun-linux-aarch64; sum=$BUN_SHA256_arm64; fi
		fetch "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${asset}.zip" "$sum" /tmp/bun.zip
		unzip -q -o /tmp/bun.zip -d /tmp
		install -m 0755 "/tmp/${asset}/bun" /usr/local/bin/bun
		ln -sf /usr/local/bin/bun /usr/local/bin/bunx
		rm -rf /tmp/bun.zip "/tmp/${asset}"
		bun --version
		;;
	osv-scanner)
		eval "sum=\$OSV_SHA256_${arch}"
		fetch "https://github.com/google/osv-scanner/releases/download/v${OSV_VERSION}/osv-scanner_linux_${arch}" "$sum" /tmp/osv-scanner
		install -m 0755 /tmp/osv-scanner /usr/local/bin/osv-scanner
		rm /tmp/osv-scanner
		osv-scanner --version
		;;
	trivy)
		if [ "$arch" = amd64 ]; then asset=Linux-64bit; else asset=Linux-ARM64; fi
		eval "sum=\$TRIVY_SHA256_${arch}"
		fetch "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_${asset}.tar.gz" "$sum" /tmp/trivy.tar.gz
		tar -xzf /tmp/trivy.tar.gz -C /usr/local/bin trivy
		rm /tmp/trivy.tar.gz
		trivy --version
		;;
	*) echo "unknown tool $1" >&2; exit 1 ;;
esac
