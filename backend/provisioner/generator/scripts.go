package generator

func GenerateProvisionScript() string {
	return `#!/bin/bash
set -e

echo "Starting Kubernetes cluster setup..."

# Загружаем конфиг
kubeadm config print init-defaults > kubeadm-config.yaml

# Инициализируем кластер
sudo kubeadm init --config=kubeadm-config.yaml

# Настраиваем kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

echo "✅ Cluster initialized successfully"
`
}

func GenerateJoinScript() string {
	return `#!/bin/bash
set -e

echo "Joining worker node to cluster..."

# Получаем токен из control-plane
TOKEN=$(kubeadm token list | grep -v TOKEN | awk '{print $1}')
CERT_HASH=$(openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //')

# Команда для присоединения
echo "🔧 Run the following command on the control-plane node to get the join command:"
echo "kubeadm token create --print-join-command"
`
}
