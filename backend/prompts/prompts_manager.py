import yaml
from jinja2 import Template


class PromptEngine:
    def __init__(self, yaml_path: str):
        """Load prompt templates from a YAML file."""
        with open(yaml_path, "r", encoding="utf-8") as f:
            self.prompts = yaml.safe_load(f)["prompt_templates"]

    def _render_string(self, text: str, context: dict) -> str:
        """Render a string using Jinja2 with the given context."""
        return Template(text).render(**context)

    def render(
        self,
        template_name: str,
        template_key: str,
        runtime_inputs: dict | None = None,
    ):
        """
        Render a prompt template.

        Args:
            template_name: Name of the prompt template in the YAML file.
            template_key: Specific template key to render.
            runtime_inputs: Optional runtime values that override YAML inputs.

        Returns:
            Tuple containing:
                - final_prompt (str)
                - resolved_inputs (dict)
        """
        # Load template configuration
        template_data = self.prompts[template_name]
        system_prompt = template_data.get("system", "")
        default_inputs = template_data.get("inputs", {})

        # Merge inputs
        merged_inputs = {
            **default_inputs,
            **(runtime_inputs or {}),
            "system": system_prompt,
        }

        # Pass 1: Resolve Jinja expressions inside input values
        resolved_inputs = {}
        for key, value in merged_inputs.items():
            if isinstance(value, str):
                resolved_inputs[key] = self._render_string(value, merged_inputs)
            else:
                resolved_inputs[key] = value

        # Fetch the requested template
        template_str = template_data["templates"][template_key]

        # Pass 2: Render the final prompt using resolved inputs
        final_prompt = self._render_string(template_str, resolved_inputs)

        return final_prompt, resolved_inputs