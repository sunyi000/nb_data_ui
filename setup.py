import setuptools

setuptools.setup(
    name="nb_data_ui",
    version='0.1.0',
    url="https://github.com/ausecocloud/nb_data_ui",
    author="Gerhard Weis",
    description="Amazing nbextension",
    install_requires=[
        'notebook',
        'tornado',
        'requests',
    ],
    #long_description=open('README.md').read(),
    packages=setuptools.find_packages(),
)
