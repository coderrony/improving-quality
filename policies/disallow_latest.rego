package kubernetes.images

# Deny Kubernetes Deployments whose containers use :latest images.

deny[msg] {
  container := input.spec.template.spec.containers[_]
  endswith(container.image, ":latest")
  msg := sprintf(
    "container %q uses forbidden :latest image %q (pin a digest or version tag)",
    [container.name, container.image],
  )
}
